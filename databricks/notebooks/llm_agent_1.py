# Databricks notebook source
# MAGIC %pip install -U -qqqq databricks-langchain langgraph==0.5.3 uv databricks-agents mlflow-skinny[databricks]
# MAGIC dbutils.library.restartPython()

# COMMAND ----------

# MAGIC %restart_python

# COMMAND ----------

import json
from io import StringIO
from typing import Annotated, Any, Optional, Sequence, TypedDict, Union

from pyspark.sql import functions as F
import pandas as pd
from databricks_langchain import (
    ChatDatabricks,
    UCFunctionToolkit
)
from langchain_core.language_models import LanguageModelLike
from langchain_core.messages import (
    AIMessage,
    BaseMessage,
    HumanMessage
)
from langchain_core.runnables import RunnableConfig, RunnableLambda
from langchain_core.tools import BaseTool
from langgraph.graph import END, StateGraph
from langgraph.graph.message import add_messages
from langgraph.prebuilt.tool_node import ToolNode

# COMMAND ----------

# MAGIC %sql
# MAGIC CREATE OR REPLACE FUNCTION de_ml_ws_3660604388778488.default.get_latest_photo_events()
# MAGIC RETURNS TABLE (
# MAGIC   location_center_lat DOUBLE,
# MAGIC   location_center_lng DOUBLE,
# MAGIC   confidence STRING,
# MAGIC   timestamp_utc TIMESTAMP
# MAGIC )
# MAGIC LANGUAGE SQL
# MAGIC RETURN
# MAGIC SELECT
# MAGIC   latitude  AS location_center_lat,
# MAGIC   longitude AS location_center_lng,
# MAGIC   modificationTime AS timestamp_utc,
# MAGIC   CASE
# MAGIC     -- mock image classification
# MAGIC     WHEN length(content) % 3 = 0 THEN 'high'
# MAGIC     WHEN length(content) % 3 = 1 THEN 'medium'
# MAGIC     ELSE 'low'
# MAGIC   END AS confidence
# MAGIC FROM de_ml_ws_3660604388778488.default.bronze_drone_photos;
# MAGIC

# COMMAND ----------

class AgentState(TypedDict):
    messages: Annotated[Sequence[BaseMessage], add_messages]
    custom_inputs: Optional[dict[str, Any]]
    custom_outputs: Optional[dict[str, Any]]


class AgentBuilder:
    def __init__(
        self, 
        model: LanguageModelLike,
        tools: Union[ToolNode, Sequence[BaseTool]],
        system_prompt: Optional[str] = None,
    ):
        self._model = model
        self._system_prompt = system_prompt
        self._tools = tools

    def run(self):
        self._bind_tools()
        return self._build_graph()

    def _build_graph(self):
        workflow = StateGraph(AgentState)
        
        workflow.add_node("agent", RunnableLambda(self._call_model))
        workflow.add_node("populate", RunnableLambda(self._populate_to_gold_layer))
        workflow.add_node("tools", ToolNode(self._tools))
        
        workflow.set_entry_point("agent")
        workflow.add_edge("agent", "tools")
        workflow.add_edge("tools", "populate")
        workflow.add_edge("populate", END)
        
        return workflow.compile()
    
    def _bind_tools(self):
        self._model = self._model.bind_tools(self._tools)

    def _populate_to_silver_layer(self, state: AgentState, config: RunnableConfig):
        last_message = state["messages"][-1]
        if hasattr(last_message, "content"):
            message_content = last_message.content
        else:
            message_content = str(last_message)

        string_df = json.loads(message_content)["value"]
        pdf = pd.read_csv(StringIO(string_df), header=0)
        df = spark.createDataFrame(pdf)

        target_columns = (
            spark
            .table("de_ml_ws_3660604388778488.default.llm_generated_silver_data_layer")
            .columns
        )

        for col in target_columns:
            if col not in df.columns:
                df = df.withColumn(col, F.lit(None))

        df.write.format("delta").mode("append").saveAsTable("de_ml_ws_3660604388778488.default.llm_generated_silver_data_layer")

        return state
    
    def _call_model(self, state: AgentState, config: RunnableConfig):
        model_runnable = self._preprocessor() | self._model
        response = model_runnable.invoke(state, config)
        return {"messages": [response]}

    def _preprocessor(self):
        if self._system_prompt:
            return RunnableLambda(
                lambda state: [{"role": "system", "content": self._system_prompt}] + state["messages"]
            )
        return RunnableLambda(lambda state: state["messages"])

    @staticmethod
    def _should_continue(state: AgentState):
        messages = state["messages"]
        last_message = messages[-1]
        if isinstance(last_message, AIMessage) and last_message.tool_calls:
            return "continue"
        else:
            return "end"

llm = ChatDatabricks(endpoint="databricks-gpt-oss-20b")
system_prompt = '''
You are a helpful assistant. Always respond **only** with a JSON array of objects.
Each object should have keys "location_center_lat", "location_center_lng", "confidence", and "timestamp_utc".
Do not include any text explanation, CSV, or extra formatting.
'''
uc_toolkit = UCFunctionToolkit(
    function_names=[
        "de_ml_ws_3660604388778488.default.get_latest_events_maslo",
    ]
)
agent_graph = AgentBuilder(llm, uc_toolkit.tools, system_prompt).run()

initial_state: AgentState = {
    "messages": [HumanMessage(content="Read data using the tool and populate to silver layer")],
    "custom_inputs": {},
    "custom_outputs": {}
}

print("*" * 40)
for x in agent_graph.invoke(initial_state, RunnableConfig())["messages"]:
    print(x)
    print()
print("*" * 40)

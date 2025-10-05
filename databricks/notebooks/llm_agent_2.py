# Databricks notebook source
# MAGIC %pip install -U -qqqq databricks-langchain langgraph==0.5.3 uv databricks-agents mlflow-skinny[databricks]
# MAGIC dbutils.library.restartPython()

# COMMAND ----------

# MAGIC %restart_python

# COMMAND ----------

from typing import Annotated, Any, Optional, Sequence, TypedDict, Union

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
# MAGIC CREATE OR REPLACE FUNCTION de_ml_ws_3660604388778488.default.get_latest_events()
# MAGIC RETURNS TABLE (
# MAGIC   detection_id STRING,
# MAGIC   timestamp_utc TIMESTAMP,
# MAGIC   sensor_id STRING,
# MAGIC   drone_id STRING,
# MAGIC   latitude DOUBLE,
# MAGIC   longitude DOUBLE,
# MAGIC   altitude_m STRING,
# MAGIC   speed_mps STRING,
# MAGIC   heading_deg STRING,
# MAGIC   course_vector STRING,
# MAGIC   signal_strength_dbm DOUBLE,
# MAGIC   confidence DOUBLE,
# MAGIC   sensor_type STRING,
# MAGIC   detection_source STRING,
# MAGIC   classification STRING,
# MAGIC   ingestion_time STRING
# MAGIC )
# MAGIC LANGUAGE SQL
# MAGIC COMMENT '
# MAGIC get_latest_events returns all drone detection records from the silver_data_layer table
# MAGIC that have been ingested after the provided timestamp (since_ts). 
# MAGIC It is designed for real-time monitoring of UAV observations and is typically used by 
# MAGIC incident aggregation agents to identify new or updated drone data points. 
# MAGIC Columns include detection metadata (IDs, timestamps, sensor info), geolocation 
# MAGIC (latitude, longitude, altitude), kinematic attributes (speed, heading, course_vector), 
# MAGIC signal quality (signal_strength_dbm, confidence), and classification labels.
# MAGIC Example usage:
# MAGIC SELECT * FROM de_ml_ws_3660604388778488.default.get_latest_events(current_timestamp() - INTERVAL 15 MINUTES);
# MAGIC '
# MAGIC RETURN
# MAGIC SELECT
# MAGIC   detection_id,
# MAGIC   timestamp_utc,
# MAGIC   sensor_id,
# MAGIC   drone_id,
# MAGIC   latitude,
# MAGIC   longitude,
# MAGIC   altitude_m,
# MAGIC   speed_mps,
# MAGIC   heading_deg,
# MAGIC   course_vector,
# MAGIC   signal_strength_dbm,
# MAGIC   confidence,
# MAGIC   sensor_type,
# MAGIC   detection_source,
# MAGIC   classification,
# MAGIC   ingestion_time
# MAGIC FROM de_ml_ws_3660604388778488.default.silver_data_layer;
# MAGIC

# COMMAND ----------

# MAGIC %sql
# MAGIC CREATE OR REPLACE FUNCTION de_ml_ws_3660604388778488.default.get_distance(lat_1 DOUBLE, long_1 DOUBLE, lat_2 DOUBLE, long_2 DOUBLE)
# MAGIC RETURNS DOUBLE
# MAGIC LANGUAGE SQL
# MAGIC RETURN
# MAGIC SELECT ( 
# MAGIC     6371 * 2 * ASIN(
# MAGIC         SQRT(
# MAGIC             POWER(SIN(RADIANS(lat_1 - lat_2) / 2), 2) +
# MAGIC             COS(RADIANS(lat_1)) * COS(RADIANS(lat_2)) *
# MAGIC             POWER(SIN(RADIANS(long_2 - long_1) / 2), 2)
# MAGIC         )
# MAGIC     )
# MAGIC )

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
        workflow.add_node("tools", ToolNode(self._tools))
        
        workflow.set_entry_point("agent")
        
        workflow.add_conditional_edges(
            "agent",
            self._should_continue,
            {"continue": "tools", "end": END},
        )
        workflow.add_edge("tools", "agent")
        
        return workflow.compile()
    
    def _bind_tools(self):
        self._model = self._model.bind_tools(self._tools)

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

llm = ChatDatabricks(endpoint="databricks-gpt-oss-120b")
system_prompt = 'System Prompt UAVO Incident Aggregator Main Task Group individual drone related data points from heterogeneous observations into incidents and generate structured output JSON for the Gold Data Layer. Process Overview Ingest Input Data Receive multiple observation records as JSON objects. Each record represents a preprocessed drone detection signal from diverse sources. Signal Sources Microphone recordings acoustic analysis results Images photo detections or AI analyzed pictures Social media posts for example Twitter X public reports Manual or user submitted reports. Definition Data Point A single structured observation of a drone or drone like object containing geospatial and temporal metadata. Incident A spatio temporally coherent cluster of data points representing the same drone or swarm activity detected by one or more sensors. Confidence is a parameter of the Incident that is calculated based on the number of data pointes associated with this incident as well as the diversity of observation types (eg. more diverse observations equal more confidence. Clustering Criteria Temporal proximity events within a short time window Spatial proximity distance threshold based on coordinates Signal correlation for example acoustic plus visual confirmation Similar heading or trajectory pattern. Output Specification Produce structured JSON summary for each grouped incident with the following fields incident_id timestamp_start and timestamp_end ISO 8601location_center lat and lng data_points lat and lang of each data point list of original data point ids or records risk_level one of low medium high critical trajectory_vector normalized xyz or bearing representation estimated_speed_kmh integer or float source_types list of source type strings summary one or two sentences stating what happened and where it is heading confidence value from 0 to 1. Example Summary Text Multiple detections indicate a probable drone swarm entering from Belarus towards Bialystok. Objective Provide actionable situational insights. For civilian authorities suggest safe evacuation zones or alert regions. For military operators assist in real time tracking and interception of potential intrusions. System Role and Constraints Operate on unified JSON formatted inputs only. Output must be deterministic and valid JSON. Focus on clarity geospatial consistency and interpretability of clusters. The goal is decision support not exhaustive detection. Use the get_latest_events method to fetch data. Incidents shouldnt consist of more than 5 observed points, add as many incidents as you like to detect all the possible drones. You should be focused on detecting all drones.'
uc_toolkit = UCFunctionToolkit(
    function_names=[
        "de_ml_ws_3660604388778488.default.get_latest_events",
        "de_ml_ws_3660604388778488.default.get_distance"
    ]
)
agent_graph = AgentBuilder(llm, uc_toolkit.tools, system_prompt).run()

initial_state: AgentState = {
    "messages": [HumanMessage(content="Start by calling: de_ml_ws_3660604388778488.default.get_latest_events, then Produce structured JSON summary for each grouped incident with the following fields incident_id timestamp_start and timestamp_end in the timestamp format yyyy-mm-dd hh:mm:ss ISO 8601 location_center lat and lng data_points list of original data point lat and lang of each data point ids or records risk_level one of low medium high critical trajectory_vector normalized xyz or bearing representation estimated_speed_kmh integer or float source_types list of source type strings summary one or two sentences stating what happened and where it is heading confidence value from 0 to 1.Output rules:- Respond in newline-delimited JSON (NDJSON), one incident object per line.- Do not include code fences, markdown, or any explanatory text.- Emit only the fields specified by the Output pecification, with correct types.- Use \"timestamp_start\" and \"timestamp_end\" in the exact format \"yyyy-mm-dd hh:mm:ss\".- If a numeric field is unknown, set it to null.")],
    "custom_inputs": {},
    "custom_outputs": {}
}

print("*" * 40)
model_response = "";
for msg in agent_graph.invoke(initial_state, RunnableConfig())["messages"]:
    print(x)
    model_response = x;
    print()
print("*" * 40)


# COMMAND ----------

import json
from pyspark.sql import SparkSession
from pyspark.sql.functions import col, lit, to_timestamp, from_json
from pyspark.sql.types import (
    StructType, StructField, StringType, DoubleType, ArrayType
)

spark = SparkSession.builder.getOrCreate()

agent_output = agent_graph.invoke(initial_state, RunnableConfig())
messages = agent_output["messages"]
model_response = messages[-1]

if not model_response:
    raise ValueError("No model response found in messages")

print("Raw model output:\n", repr(model_response.content))

json_strs = [line for line in model_response.content.strip().split("\n") if line.strip()]
df_strings = spark.createDataFrame(json_strs, "string").toDF("value")

point_schema = StructType([
    StructField("lat", DoubleType(), True),
    StructField("lng", DoubleType(), True),
])

schema = StructType([
    StructField("incident_id", StringType(), True),
    StructField("timestamp_start", StringType(), True),
    StructField("timestamp_end", StringType(), True),
    StructField("location_center", StructType([
        StructField("lat", DoubleType(), True),
        StructField("lng", DoubleType(), True),
    ]), True),
    StructField("data_points", ArrayType(point_schema), True),
    StructField("risk_level", StringType(), True),
    StructField("trajectory_vector", StringType(), True),
    StructField("estimated_speed_kmh", DoubleType(), True),
    StructField("source_types", ArrayType(StringType()), True),
    StructField("summary", StringType(), True),
    StructField("confidence", DoubleType(), True),
])

df_raw = df_strings.select(from_json(col("value"), schema).alias("j")).select("j.*")

print("Schema of raw incidents:")
df_raw.printSchema()

df = (
    df_raw.select(
        col("incident_id").cast("string").alias("incident_id"),
        to_timestamp(col("timestamp_start"), "yyyy-MM-dd HH:mm:ss").alias("timestamp_start"),
        to_timestamp(col("timestamp_end"), "yyyy-MM-dd HH:mm:ss").alias("timestamp_end"),
        col("location_center.lat").cast("double").alias("location_center_lat"),
        col("location_center.lng").cast("double").alias("location_center_lng"),
        col("data_points").cast("array<struct<lat: double, lng: double>>").alias("data_points"),
        col("risk_level").cast("string").alias("risk_level"),
        lit(None).cast("double").alias("trajectory_bearing_degrees"),
        lit(None).cast("double").alias("trajectory_normalized_x"),
        lit(None).cast("double").alias("trajectory_normalized_y"),
        lit(None).cast("double").alias("trajectory_normalized_z"),
    )
)

print("Schema of parsed incidents (projected to target schema):")
df.printSchema()

uc_catalog = "de_ml_ws_3660604388778488"
uc_schema = "default"
full_table = f"`{uc_catalog}`.{uc_schema}.gold_layer_incidents"

spark.sql(f"USE CATALOG `{uc_catalog}`")
spark.sql(f"USE `{uc_schema}`")

(
    df.write
    .format("delta")
    .mode("append")
    .saveAsTable(full_table)
)

inserted = df.count()
table_count = spark.table(full_table).count()
print("Inserted rows:", inserted)
print("Current row count in table (UC):", table_count)

spark.sql(f"SELECT * FROM {full_table} ORDER BY timestamp_start DESC LIMIT 5").show(truncate=False)

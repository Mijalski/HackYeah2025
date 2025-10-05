# Databricks notebook source
# MAGIC %md
# MAGIC ## Image preprocessor 
# MAGIC The purpose of this notebook is to take raw images from the data lake and present those images in a table format.
# MAGIC
# MAGIC In the future, this workflow should be integrated with a deployment pipeline using Databricks Asset Bundles, Autoloader, and related tools.

# COMMAND ----------

from pyspark.sql import functions as F

df = spark.read.format("binaryFile").load(
    "/Volumes/de_ml_ws_3660604388778488/default/dl/raw_drone_photos/"
)

# mock geolocation read from image metadata
df = (
    df
    .withColumn("latitude", F.lit(52.03) + (F.rand() - 0.5) * 0.04)
    .withColumn("longitude", F.lit(23.12) + (F.rand() - 0.5) * 0.04)
)

(
    df.write.format("delta")
    .mode("append")
    .saveAsTable("de_ml_ws_3660604388778488.default.bronze_drone_photos")
)

# COMMAND ----------

# MAGIC %sql
# MAGIC
# MAGIC select * 
# MAGIC from de_ml_ws_3660604388778488.default.bronze_drone_photos

# COMMAND ----------

images_df = spark.read.table("de_ml_ws_3660604388778488.default.bronze_drone_photos")

image = images_df.select("content").limit(1).collect()[0]['content']

# COMMAND ----------

from PIL import Image
from io import BytesIO

img = Image.open(BytesIO(image))

display(img)
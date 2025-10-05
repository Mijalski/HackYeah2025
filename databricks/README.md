# Databricks Artifacts

- **infrastructure/**: Contains Terraform files for setting up Databricks infrastructure.
- **notebooks/**: Contains Python scripts for Databricks code. There are two agents:
  - The first agent populates data from the bronze layer to the silver layer using a specific tool.
  - The second agent performs the same operation from the silver layer to the gold layer.
  - Additionally, there is an image processor that converts raw images into table-format images.

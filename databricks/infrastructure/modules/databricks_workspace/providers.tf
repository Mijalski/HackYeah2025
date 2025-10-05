terraform {
  required_providers {
    databricks = {
      source  = "databricks/databricks"
      version = "~> 1.87.0"
    }
  }
}

provider "databricks" {
  host = azurerm_databricks_workspace.this.workspace_url
}

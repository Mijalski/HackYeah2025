// TODO: Rename this file from .ignore to .tf after setting DATABRICKS_HOST and DATABRICKS_TOKEN environment variables

resource "databricks_storage_credential" "adls_managed_identity_credential" {
  name = "external-storage-credential"
  azure_managed_identity {
    access_connector_id = azurerm_databricks_access_connector.this.id
    managed_identity_id = azurerm_user_assigned_identity.this.id
  }
}

resource "databricks_external_location" "this" {
  name = "adls-external-location"
  url = format(
    "abfss://%s@%s.dfs.core.windows.net",
    var.storage_container_name,
    var.storage_account_name
  )
  credential_name = databricks_storage_credential.adls_managed_identity_credential.id
}
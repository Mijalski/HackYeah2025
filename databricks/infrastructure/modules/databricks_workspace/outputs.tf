output "workspace_url" {
  value = azurerm_databricks_workspace.this.workspace_url
}

output "user_assigned_identity_principal_id" {
  value = azurerm_user_assigned_identity.this.principal_id
}
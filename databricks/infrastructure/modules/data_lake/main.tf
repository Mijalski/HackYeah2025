resource "azurerm_resource_group" "this" {
  name     = var.resource_group_name
  location = var.location
}

resource "azurerm_storage_account" "this" {
  name                     = var.storage_account_name
  resource_group_name      = azurerm_resource_group.this.name
  location                 = azurerm_resource_group.this.location
  account_tier             = var.account_tier
  account_kind             = var.account_kind
  account_replication_type = var.account_replication_type
  is_hns_enabled           = var.is_hns_enabled
}

resource "azurerm_storage_container" "data" {
  name                  = var.storage_container_name
  storage_account_id    = azurerm_storage_account.this.id
  container_access_type = var.container_access_type
}

resource "azurerm_role_assignment" "external_storage_blob_role" {
  scope                = azurerm_storage_account.this.id
  role_definition_name = "Storage Blob Data Contributor"
  principal_id         = var.external_principal_id
}

resource "azurerm_role_assignment" "external_storage_queue_role" {
  scope                = azurerm_storage_account.this.id
  role_definition_name = "Storage Queue Data Contributor"
  principal_id         = var.external_principal_id
}

resource "azurerm_role_assignment" "external_storage_account_role" {
  scope                = azurerm_storage_account.this.id
  role_definition_name = "Storage Account Contributor"
  principal_id         = var.external_principal_id
}

resource "azurerm_role_assignment" "eventgrid_event_subscription_contributor" {
  scope                = azurerm_resource_group.this.id
  role_definition_name = "EventGrid EventSubscription Contributor"
  principal_id         = var.external_principal_id
}
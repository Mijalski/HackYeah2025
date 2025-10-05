terraform {
  // Use this when initializing: terraform init -backend-config=./backend/backend.hcl
  backend "azurerm" {}
  required_version = ">= 1.12.2"
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = ">= 4.41.0"
    }
    databricks = {
      source  = "databricks/databricks"
      version = "~> 1.87.0"
    }
  }
}

provider "azurerm" {
  features {}
  subscription_id = var.azure_subscription_id
  tenant_id       = var.azure_tenant_id
}

provider "databricks" {
  host = module.databricks_workspace.workspace_url
}

module "databricks_workspace" {
  source                 = "./modules/databricks_workspace"
  location               = var.azure_location
  storage_account_name   = var.storage_account_name
  storage_container_name = var.storage_container_name
}

module "data_lake" {
  source                 = "./modules/data_lake"
  location               = var.azure_location
  storage_account_name   = var.storage_account_name
  storage_container_name = var.storage_container_name
  external_principal_id  = module.databricks_workspace.user_assigned_identity_principal_id
}
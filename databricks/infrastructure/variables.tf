variable "azure_subscription_id" {
  type = string
}

variable "azure_tenant_id" {
  type = string
}

variable "azure_location" {
  type = string
}

# CONFIGURED: Change random suffix
variable "storage_account_name" {
  type    = string
  default = "dldatalandingadls606797"
}

variable "storage_container_name" {
  type    = string
  default = "data"
}
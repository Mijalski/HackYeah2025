variable "location" {
  type = string
}

variable "resource_group_name" {
  type    = string
  default = "dbx-ws-rg"
}

variable "workspace_name" {
  type    = string
  default = "de-ml-ws"
}

variable "managed_resource_group_name" {
  type    = string
  default = "dbx-managed-rg"
}

variable "sku" {
  type    = string
  default = "premium"
}

variable "storage_account_name" {
  type = string
}

variable "storage_container_name" {
  type = string
}
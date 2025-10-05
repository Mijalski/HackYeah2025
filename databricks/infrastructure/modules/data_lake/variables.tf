variable "location" {
  type = string
}

variable "resource_group_name" {
  type    = string
  default = "dl-rg"
}

variable "storage_account_name" {
  type = string
}

variable "storage_container_name" {
  type = string
}

variable "container_access_type" {
  type    = string
  default = "private"
}

variable "account_tier" {
  type    = string
  default = "Standard"
}

variable "account_kind" {
  type    = string
  default = "StorageV2"
}

variable "account_replication_type" {
  type    = string
  default = "LRS"
}

variable "is_hns_enabled" {
  type    = string
  default = "true"
}

variable "external_principal_id" {
  type    = string
}
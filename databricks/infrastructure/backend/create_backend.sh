#!/bin/bash

# Script to create the Azure storage account for Terraform state backend.
# Usage: source infrastructure/backend/create_backend.sh

set -e

source ./infrastructure/backend/export_terraform_vars.sh

if ! az account show &>/dev/null; then
    echo "You are not logged in. Run 'az login' first."
    sleep 5
    exit 1
fi

if az storage account check-name --name $storage_account_name --query "nameAvailable" -o tsv | grep true; then
    echo "Creating Terraform backend storage account..."
    
    az group create \
        --name $resource_group_name \
        --location $azure_location
    
    az storage account create \
        --name $storage_account_name \
        --resource-group $resource_group_name \
        --location $azure_location \
        --sku Standard_LRS

    az storage container create \
        --account-name $storage_account_name \
        --name $container_name \
        --public-access off

    echo "Backend created successfully."

else
    echo "Error: Storage account $storage_account_name already exists or is incorrect. Aborting."
    sleep 5
    exit 1
fi

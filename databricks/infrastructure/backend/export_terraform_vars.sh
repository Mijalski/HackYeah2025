#!/bin/bash

# This script exports variables from terraform.tfvars as environment variables
# Usage: source infrastructure/backend/export_terraform_vars.sh


set -e

# TODO: add file path checks
BACKEND_VARS_FILE="./infrastructure/backend/backend.hcl"
TERRAFORM_VARS_FILE="./infrastructure/terraform.tfvars"
ALL_VARS_FILE="/tmp/concatenated_vars.tmp"


# Concatenate files with variables into a temporary file
cat "$BACKEND_VARS_FILE" <(echo) "$TERRAFORM_VARS_FILE" <(echo) > "$ALL_VARS_FILE"
echo "Concatenated $BACKEND_VARS_FILE and $TERRAFORM_VARS_FILE into $ALL_VARS_FILE"

# Read the file line by line
while IFS= read -r line || [[ -n "$line" ]]; do

  # Skip empty lines and comments
  [[ -z "$line" || "$line" =~ ^# ]] && continue

  # Trim whitespace from key
  key=$(echo "$line" | cut -d'=' -f1 | xargs)
  
  # Trim whitespace and remove quotes from value
  value=$(echo "$line" | cut -d'=' -f2- | xargs | sed 's/\"//g')
  
  # Export as environment variable
  export "$key=$value"
  echo "Exported $key=$value"

done < "$ALL_VARS_FILE"

echo "All variables have been exported as environment variables."

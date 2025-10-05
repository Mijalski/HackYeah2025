azure-login:
	az login

azure-details:
	az account show

terraform-init:
	cd infrastructure && \
		terraform init -backend-config=./backend/backend.hcl -upgrade

terraform-plan:
	cd infrastructure && \
		terraform plan -out=tfplan

terraform-apply:
	cd infrastructure && \
		terraform apply tfplan

terraform-format:
	cd infrastructure && \
		terraform fmt -recursive

terraform-destroy:
	cd infrastructure && \
		terraform destroy

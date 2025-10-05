FROM mcr.microsoft.com/devcontainers/python:1-3.11-bookworm

# 🚀 Install Terraform
RUN sudo apt-get update && sudo apt-get install -y gnupg software-properties-common

RUN wget -O- https://apt.releases.hashicorp.com/gpg | \
    gpg --dearmor | \
    sudo tee /usr/share/keyrings/hashicorp-archive-keyring.gpg > /dev/null

RUN gpg --no-default-keyring \
    --keyring /usr/share/keyrings/hashicorp-archive-keyring.gpg \
    --fingerprint

RUN echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] https://apt.releases.hashicorp.com $(grep -oP '(?<=UBUNTU_CODENAME=).*' /etc/os-release || lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/hashicorp.list

RUN sudo apt update

RUN sudo apt-get install terraform
# -----------------


# ☁️ Install Azure CLI
RUN curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash
# -----------------


# 🧱 Install Databricks CLI1
RUN curl -fsSL https://raw.githubusercontent.com/databricks/setup-cli/main/install.sh | sh
# -----------------


# 🌟 Install uv
USER vscode
RUN curl -LsSf https://astral.sh/uv/install.sh | sh

# Add uv to PATH permanently
ENV PATH="/home/vscode/.local/bin:${PATH}"
# -----------------
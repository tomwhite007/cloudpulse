terraform {
  required_version = ">= 1.5.0"

  backend "s3" {
    bucket  = "cloudpulse-tfstate-sandbox-657383559279"
    key     = "sandbox/terraform.tfstate"
    region  = "eu-west-1"
    encrypt = true
  }

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "eu-west-1"
}

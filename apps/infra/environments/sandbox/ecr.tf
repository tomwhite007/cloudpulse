resource "aws_ecr_repository" "cloudpulse_auditor_api" {
  name                 = "cloudpulse-auditor-api"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = {
    Name        = "cloudpulse-auditor-api"
    Environment = "sandbox"
    ManagedBy   = "Terraform"
  }
}

resource "aws_ecr_lifecycle_policy" "cloudpulse_auditor_api" {
  repository = aws_ecr_repository.cloudpulse_auditor_api.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Keep only the last 3 images"
        selection = {
          tagStatus   = "any"
          countType   = "imageCountMoreThan"
          countNumber = 3
        }
        action = {
          type = "expire"
        }
      }
    ]
  })
}

output "ecr_repository_url" {
  description = "URL of the CloudPulse auditor-api ECR repository"
  value       = aws_ecr_repository.cloudpulse_auditor_api.repository_url
}

resource "aws_ecr_repository" "cloudpulse_web" {
  name                 = "cloudpulse-web"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = {
    Name        = "cloudpulse-web"
    Environment = "sandbox"
    ManagedBy   = "Terraform"
  }
}

resource "aws_ecr_lifecycle_policy" "cloudpulse_web" {
  repository = aws_ecr_repository.cloudpulse_web.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Keep only the last 3 images"
        selection = {
          tagStatus   = "any"
          countType   = "imageCountMoreThan"
          countNumber = 3
        }
        action = {
          type = "expire"
        }
      }
    ]
  })
}

output "ecr_web_repository_url" {
  description = "URL of the CloudPulse web ECR repository"
  value       = aws_ecr_repository.cloudpulse_web.repository_url
}

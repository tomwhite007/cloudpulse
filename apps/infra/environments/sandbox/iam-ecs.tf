data "aws_iam_policy_document" "ecs_task_assume" {
  statement {
    effect = "Allow"

    principals {
      type        = "Service"
      identifiers = ["ecs-tasks.amazonaws.com"]
    }

    actions = ["sts:AssumeRole"]
  }
}

resource "aws_iam_role" "ecs_execution_role" {
  name               = "cloudpulse-ecs-execution-role"
  assume_role_policy = data.aws_iam_policy_document.ecs_task_assume.json

  tags = {
    Name        = "cloudpulse-ecs-execution-role"
    Environment = "sandbox"
    ManagedBy   = "Terraform"
  }
}

resource "aws_iam_role_policy_attachment" "ecs_execution_role" {
  role       = aws_iam_role.ecs_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

data "aws_iam_policy_document" "ecs_execution_ssm" {
  statement {
    sid    = "ReadAuditorApiKey"
    effect = "Allow"
    actions = [
      "ssm:GetParameters",
      "ssm:GetParameter",
    ]
    resources = [data.aws_ssm_parameter.auditor_api_key.arn]
  }
}

resource "aws_iam_role_policy" "ecs_execution_ssm" {
  name   = "cloudpulse-ecs-execution-ssm"
  role   = aws_iam_role.ecs_execution_role.id
  policy = data.aws_iam_policy_document.ecs_execution_ssm.json
}

data "aws_iam_policy_document" "auditor_task_audit" {
  statement {
    sid    = "LeastPrivilegeAudit"
    effect = "Allow"
    actions = [
      "ec2:DescribeVolumes",
      "ec2:DescribeInstances",
      "ec2:DescribeAddresses",
      "rds:DescribeDBInstances",
      "lambda:ListFunctions",
      "cloudwatch:GetMetricData",
      "cloudwatch:GetMetricStatistics",
    ]
    resources = ["*"]
  }
}

resource "aws_iam_role" "auditor_task_role" {
  name               = "cloudpulse-auditor-api-task-role"
  assume_role_policy = data.aws_iam_policy_document.ecs_task_assume.json

  tags = {
    Name        = "cloudpulse-auditor-api-task-role"
    Environment = "sandbox"
    ManagedBy   = "Terraform"
  }
}

resource "aws_iam_role_policy" "auditor_task_audit" {
  name   = "cloudpulse-auditor-api-audit"
  role   = aws_iam_role.auditor_task_role.id
  policy = data.aws_iam_policy_document.auditor_task_audit.json
}

output "ecs_execution_role_arn" {
  description = "ARN of the ECS task execution role"
  value       = aws_iam_role.ecs_execution_role.arn
}

output "auditor_task_role_arn" {
  description = "ARN of the auditor-api ECS task role"
  value       = aws_iam_role.auditor_task_role.arn
}

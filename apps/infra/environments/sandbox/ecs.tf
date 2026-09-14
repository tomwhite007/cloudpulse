data "aws_ssm_parameter" "auditor_api_key" {
  name            = "/cloudpulse/sandbox/AUDITOR_API_KEY"
  with_decryption = false
}

data "aws_vpc" "default" {
  default = true
}

data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}

resource "aws_security_group" "auditor_api_sg" {
  name        = "cloudpulse-auditor-api-sg"
  description = "Allow inbound HTTP to NestJS on port 3333"
  vpc_id      = data.aws_vpc.default.id

  ingress {
    description = "NestJS HTTP"
    from_port   = 3333
    to_port     = 3333
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "cloudpulse-auditor-api-sg"
    Environment = "sandbox"
    ManagedBy   = "Terraform"
  }
}

resource "aws_ecs_cluster" "auditor_cluster" {
  name = "cloudpulse-sandbox-cluster"

  tags = {
    Name        = "cloudpulse-sandbox-cluster"
    Environment = "sandbox"
    ManagedBy   = "Terraform"
  }
}

resource "aws_cloudwatch_log_group" "ecs_logs" {
  name              = "/ecs/cloudpulse-auditor-api"
  retention_in_days = 7

  tags = {
    Name        = "/ecs/cloudpulse-auditor-api"
    Environment = "sandbox"
    ManagedBy   = "Terraform"
  }
}

resource "aws_ecs_task_definition" "auditor_api" {
  family                   = "cloudpulse-auditor-api"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = "256"
  memory                   = "512"
  execution_role_arn       = aws_iam_role.ecs_execution_role.arn
  task_role_arn            = aws_iam_role.auditor_task_role.arn

  runtime_platform {
    operating_system_family = "LINUX"
    cpu_architecture        = "ARM64"
  }

  container_definitions = jsonencode([{
    name      = "auditor-api"
    image     = "${aws_ecr_repository.cloudpulse_auditor_api.repository_url}:latest"
    essential = true
    portMappings = [{
      containerPort = 3333
      hostPort      = 3333
    }]
    environment = [
      { name = "NODE_ENV", value = "production" },
      { name = "PORT", value = "3333" },
      { name = "USE_LIVE_AWS", value = "true" },
      { name = "AWS_REGION", value = "eu-west-1" }
    ]
    secrets = [
      {
        name      = "AUDITOR_API_KEY"
        valueFrom = data.aws_ssm_parameter.auditor_api_key.arn
      }
    ]
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = "/ecs/cloudpulse-auditor-api"
        "awslogs-region"        = "eu-west-1"
        "awslogs-stream-prefix" = "ecs"
        "awslogs-create-group"  = "true"
      }
    }
  }])

  depends_on = [aws_cloudwatch_log_group.ecs_logs]

  tags = {
    Name        = "cloudpulse-auditor-api"
    Environment = "sandbox"
    ManagedBy   = "Terraform"
  }
}

resource "aws_ecs_service" "auditor_api" {
  name            = "cloudpulse-auditor-api"
  cluster         = aws_ecs_cluster.auditor_cluster.id
  task_definition = aws_ecs_task_definition.auditor_api.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = data.aws_subnets.default.ids
    security_groups  = [aws_security_group.auditor_api_sg.id]
    assign_public_ip = true
  }

  tags = {
    Name        = "cloudpulse-auditor-api"
    Environment = "sandbox"
    ManagedBy   = "Terraform"
  }
}

data "aws_vpc" "default" {
  default = true
}

data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}

resource "aws_security_group" "alb_sg" {
  name        = "cloudpulse-alb-sg"
  description = "Allow inbound HTTP/HTTPS to the sandbox ALB"
  vpc_id      = data.aws_vpc.default.id

  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
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
    Name        = "cloudpulse-alb-sg"
    Environment = "sandbox"
    ManagedBy   = "Terraform"
  }
}

resource "aws_security_group" "web_sg" {
  name        = "cloudpulse-web-sg"
  description = "Allow inbound HTTP to Next.js on port 3000 from the ALB"
  vpc_id      = data.aws_vpc.default.id

  ingress {
    description     = "Next.js HTTP"
    from_port       = 3000
    to_port         = 3000
    protocol        = "tcp"
    security_groups = [aws_security_group.alb_sg.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "cloudpulse-web-sg"
    Environment = "sandbox"
    ManagedBy   = "Terraform"
  }
}

resource "aws_security_group" "auditor_api_sg" {
  name        = "cloudpulse-auditor-api-sg"
  description = "Allow inbound HTTP to NestJS on port 3333 from the Next.js container"
  vpc_id      = data.aws_vpc.default.id

  ingress {
    description     = "NestJS HTTP"
    from_port       = 3333
    to_port         = 3333
    protocol        = "tcp"
    security_groups = [aws_security_group.web_sg.id]
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

resource "aws_lb" "alb" {
  name               = "cloudpulse-sandbox-alb"
  load_balancer_type = "application"
  subnets            = data.aws_subnets.default.ids
  security_groups    = [aws_security_group.alb_sg.id]

  tags = {
    Name        = "cloudpulse-sandbox-alb"
    Environment = "sandbox"
    ManagedBy   = "Terraform"
  }
}

resource "aws_lb_target_group" "web" {
  name        = "cloudpulse-web-tg"
  port        = 3000
  protocol    = "HTTP"
  target_type = "ip"
  vpc_id      = data.aws_vpc.default.id

  health_check {
    path = "/"
  }

  tags = {
    Name        = "cloudpulse-web-tg"
    Environment = "sandbox"
    ManagedBy   = "Terraform"
  }
}

resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.alb.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type = "redirect"

    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}

resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.alb.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = aws_acm_certificate_validation.cert.certificate_arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.web.arn
  }
}

resource "aws_service_discovery_private_dns_namespace" "main" {
  name = "cloudpulse.local"
  vpc  = data.aws_vpc.default.id

  tags = {
    Name        = "cloudpulse.local"
    Environment = "sandbox"
    ManagedBy   = "Terraform"
  }
}

resource "aws_service_discovery_service" "auditor_api" {
  name = "auditor-api"

  dns_config {
    namespace_id = aws_service_discovery_private_dns_namespace.main.id

    dns_records {
      ttl  = 60
      type = "A"
    }
  }

  health_check_custom_config {
    failure_threshold = 1
  }

  tags = {
    Name        = "auditor-api"
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

resource "aws_cloudwatch_log_group" "web_logs" {
  name              = "/ecs/cloudpulse-web"
  retention_in_days = 7

  tags = {
    Name        = "/ecs/cloudpulse-web"
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
      { name = "AWS_REGION", value = "eu-west-1" }
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

  service_registries {
    registry_arn = aws_service_discovery_service.auditor_api.arn
  }

  tags = {
    Name        = "cloudpulse-auditor-api"
    Environment = "sandbox"
    ManagedBy   = "Terraform"
  }
}

resource "aws_ecs_task_definition" "web" {
  family                   = "cloudpulse-web"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = "256"
  memory                   = "512"
  execution_role_arn       = aws_iam_role.ecs_execution_role.arn

  runtime_platform {
    operating_system_family = "LINUX"
    cpu_architecture        = "ARM64"
  }

  container_definitions = jsonencode([{
    name      = "web"
    image     = "${aws_ecr_repository.cloudpulse_web.repository_url}:latest"
    essential = true
    portMappings = [{
      containerPort = 3000
      hostPort      = 3000
    }]
    environment = [
      { name = "NODE_ENV", value = "production" },
      { name = "PORT", value = "3000" },
      { name = "HOSTNAME", value = "0.0.0.0" },
      { name = "AUDITOR_API_URL", value = "http://auditor-api.cloudpulse.local:3333" },
      { name = "NEXT_PUBLIC_AUDITOR_API_URL", value = "" },
      { name = "COOKIE_SECURE", value = "true" },
      { name = "GITHUB_REPO_OWNER", value = "tomwhite007" },
      { name = "GITHUB_REPO_NAME", value = "cloudpulse" }
    ]
    secrets = [
      {
        name      = "ANTHROPIC_API_KEY"
        valueFrom = data.aws_ssm_parameter.anthropic_api_key.arn
      },
      {
        name      = "GITHUB_TOKEN"
        valueFrom = data.aws_ssm_parameter.github_token.arn
      },
      {
        name      = "DEMO_INVITE_PASSPHRASE"
        valueFrom = data.aws_ssm_parameter.demo_invite_passphrase.arn
      }
    ]
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = "/ecs/cloudpulse-web"
        "awslogs-region"        = "eu-west-1"
        "awslogs-stream-prefix" = "ecs"
        "awslogs-create-group"  = "true"
      }
    }
  }])

  depends_on = [aws_cloudwatch_log_group.web_logs]

  tags = {
    Name        = "cloudpulse-web"
    Environment = "sandbox"
    ManagedBy   = "Terraform"
  }
}

resource "aws_ecs_service" "web" {
  name            = "cloudpulse-web"
  cluster         = aws_ecs_cluster.auditor_cluster.id
  task_definition = aws_ecs_task_definition.web.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = data.aws_subnets.default.ids
    security_groups  = [aws_security_group.web_sg.id]
    assign_public_ip = true
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.web.arn
    container_name   = "web"
    container_port   = 3000
  }

  depends_on = [aws_lb_listener.https]

  tags = {
    Name        = "cloudpulse-web"
    Environment = "sandbox"
    ManagedBy   = "Terraform"
  }
}

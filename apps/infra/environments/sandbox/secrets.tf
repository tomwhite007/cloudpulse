locals {
  anthropic_api_key_ssm_name = "/cloudpulse/sandbox/web/ANTHROPIC_API_KEY"
  github_token_ssm_name      = "/cloudpulse/sandbox/web/GITHUB_TOKEN"
}

data "aws_ssm_parameter" "anthropic_api_key" {
  name            = local.anthropic_api_key_ssm_name
  with_decryption = false
}

data "aws_ssm_parameter" "github_token" {
  name            = local.github_token_ssm_name
  with_decryption = false
}

data "aws_iam_policy_document" "ecs_execution_secrets" {
  statement {
    sid    = "ReadSandboxWebSecrets"
    effect = "Allow"
    actions = [
      "ssm:GetParameter",
      "ssm:GetParameters",
    ]
    resources = [
      data.aws_ssm_parameter.anthropic_api_key.arn,
      data.aws_ssm_parameter.github_token.arn,
    ]
  }
}

resource "aws_iam_role_policy" "ecs_execution_secrets" {
  name   = "cloudpulse-ecs-execution-secrets"
  role   = aws_iam_role.ecs_execution_role.id
  policy = data.aws_iam_policy_document.ecs_execution_secrets.json
}


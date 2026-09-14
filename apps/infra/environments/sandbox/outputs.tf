output "ecs_cluster_name" {
  description = "Name of the sandbox ECS cluster"
  value       = aws_ecs_cluster.auditor_cluster.name
}

output "ecs_service_name" {
  description = "Name of the auditor-api ECS service"
  value       = aws_ecs_service.auditor_api.name
}

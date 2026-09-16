# CloudPulse Monitored Storage
# TOMBSTONED by CloudPulse — cloudpulse-test-waste (vol-0b872b4713ca27939)
# resource "aws_ebs_volume" "cloudpulse_test_waste" {
#   availability_zone = "eu-west-1a"
#   size              = 1
#   type              = "gp3"
#
#   tags = {
#     Name        = "cloudpulse-test-waste"
#     Environment = "sandbox"
#     ManagedBy   = "Terraform"
#   }
# }

# CloudPulse live zombie fixture — cloudpulse-test-waste-2
# TOMBSTONED by CloudPulse — cloudpulse-test-waste-2 (vol-01eff4e7fb155d1a8)
# resource "aws_ebs_volume" "cloudpulse_test_waste_2" {
#   availability_zone = "eu-west-1a"
#   size              = 1
#   type              = "gp3"
#
#   tags = {
#     Name        = "cloudpulse-test-waste-2"
#     Environment = "sandbox"
#     ManagedBy   = "Terraform"
#     Purpose     = "CloudPulseZombieTest"
#   }
# }
# TOMBSTONED by CloudPulse — cloudpulse-zombie-vol (vol-02f8da166848b65bc)
# apps/infra/environments/sandbox/storage.tf
# - resource "aws_ebs_volume" "cloudpulse_zombie_vol" {
# -   ...
# - }
# + # TOMBSTONED by CloudPulse (FinOps Remediation)
# + # resource "aws_ebs_volume" "cloudpulse_zombie_vol" { ... }
# TOMBSTONED by CloudPulse — cloudpulse-zombie-vol-2026-09-15 (vol-01ad1fe87cbeb4a38)
# apps/infra/environments/sandbox/storage.tf
# - resource "aws_ebs_volume" "cloudpulse_zombie_vol_2026_09_15" {
# -   ...
# - }
# + # TOMBSTONED by CloudPulse (FinOps Remediation)
# + # resource "aws_ebs_volume" "cloudpulse_zombie_vol_2026_09_15" { ... }
# TOMBSTONED by CloudPulse — 52.18.132.197 (eipalloc-0bd2e01043721d5d7)
# apps/infra/environments/sandbox/storage.tf
# - resource "aws_eip" "cloudpulse_eip_52_18_132_197" {
# -   ...
# - }
# + # TOMBSTONED by CloudPulse (FinOps Remediation)
# + # resource "aws_eip" "cloudpulse_eip_52_18_132_197" { ... }

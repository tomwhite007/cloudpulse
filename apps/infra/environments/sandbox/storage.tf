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

# Managed Zombie Fixture — 2026-09-16
resource "aws_ebs_volume" "cloudpulse_zombie_vol_2026_09_16" {
  availability_zone = "eu-west-1a"
  size              = 1
  type              = "gp3"

  tags = {
    Name        = "cloudpulse-zombie-vol-2026-09-16-tf"
    Environment = "sandbox"
    ManagedBy   = "Terraform"
  }
}

resource "aws_eip" "cloudpulse_zombie_eip_2026_09_16" {
  domain = "vpc"

  tags = {
    Name        = "cloudpulse-zombie-eip-2026-09-16-tf"
    Environment = "sandbox"
    ManagedBy   = "Terraform"
  }
}

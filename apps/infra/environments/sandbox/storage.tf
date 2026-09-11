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
resource "aws_ebs_volume" "cloudpulse_test_waste_2" {
  availability_zone = "eu-west-1a"
  size              = 1
  type              = "gp3"

  tags = {
    Name        = "cloudpulse-test-waste-2"
    Environment = "sandbox"
    ManagedBy   = "Terraform"
    Purpose     = "CloudPulseZombieTest"
  }
}

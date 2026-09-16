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
# TOMBSTONED by CloudPulse (FinOps Remediation) — cloudpulse-zombie-vol (vol-02f8da166848b65bc)
import {
  to = aws_ebs_volume.remediated_vol_02f8da166848b65bc
  id = "vol-02f8da166848b65bc"
}

removed {
  from = aws_ebs_volume.remediated_vol_02f8da166848b65bc
  lifecycle {
    destroy = true
  }
}

# TOMBSTONED by CloudPulse (FinOps Remediation) — cloudpulse-zombie-vol-2026-09-15 (vol-01ad1fe87cbeb4a38)
import {
  to = aws_ebs_volume.remediated_vol_01ad1fe87cbeb4a38
  id = "vol-01ad1fe87cbeb4a38"
}

removed {
  from = aws_ebs_volume.remediated_vol_01ad1fe87cbeb4a38
  lifecycle {
    destroy = true
  }
}

# TOMBSTONED by CloudPulse (FinOps Remediation) — 52.18.132.197 (eipalloc-0bd2e01043721d5d7)
import {
  to = aws_eip.remediated_eip_0bd2e01043721d5d7
  id = "eipalloc-0bd2e01043721d5d7"
}

removed {
  from = aws_eip.remediated_eip_0bd2e01043721d5d7
  lifecycle {
    destroy = true
  }
}

# TOMBSTONED by CloudPulse (FinOps Remediation) — 54.247.132.19 (eipalloc-050c132df2341fedf)
import {
  to = aws_eip.remediated_eip_050c132df2341fedf
  id = "eipalloc-050c132df2341fedf"
}

removed {
  from = aws_eip.remediated_eip_050c132df2341fedf
  lifecycle {
    destroy = true
  }
}

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

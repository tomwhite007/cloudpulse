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
# TOMBSTONED by CloudPulse — cloudpulse-zombie-vol-2026-09-16-tf (vol-05d8c16426cf5f181)
# resource "aws_ebs_volume" "cloudpulse_zombie_vol_2026_09_16" {
#   availability_zone = "eu-west-1a"
#   size              = 1
#   type              = "gp3"
#
#   tags = {
#     Name        = "cloudpulse-zombie-vol-2026-09-16-tf"
#     Environment = "sandbox"
#     ManagedBy   = "Terraform"
#   }
# }

# TOMBSTONED by CloudPulse — cloudpulse-zombie-eip-2026-09-16-tf (eipalloc-0123e2e86d4cbbbe0)
# resource "aws_eip" "cloudpulse_zombie_eip_2026_09_16" {
#   domain = "vpc"
#
#   tags = {
#     Name        = "cloudpulse-zombie-eip-2026-09-16-tf"
#     Environment = "sandbox"
#     ManagedBy   = "Terraform"
#   }
# }
# TOMBSTONED by CloudPulse (FinOps Remediation) — 54.247.132.19 (eipalloc-050c132df2341fedf)
# Unmanaged AWS resource (not found in HCL configuration). Decommissioned out-of-band.
# TOMBSTONED by CloudPulse (FinOps Remediation) — 52.18.132.197 (eipalloc-0bd2e01043721d5d7)
# Unmanaged AWS resource (not found in HCL configuration). Decommissioned out-of-band.
# TOMBSTONED by CloudPulse (FinOps Remediation) — 34.251.40.229 (eipalloc-09cd8d4c528267722)
# Unmanaged AWS resource (not found in HCL configuration). Decommissioned out-of-band.
# TOMBSTONED by CloudPulse (FinOps Remediation) — 34.251.238.255 (eipalloc-0123e2e86d4cbbbe0)
# Unmanaged AWS resource (not found in HCL configuration). Decommissioned out-of-band.
# TOMBSTONED by CloudPulse (FinOps Remediation) — cloudpulse-zombie-vol-2026-09-16 (vol-0a2ba865cc8b2b35d)
# Unmanaged AWS resource (not found in HCL configuration). Decommissioned out-of-band.
# TOMBSTONED by CloudPulse (FinOps Remediation) — cloudpulse-zombie-vol-2026-09-15 (vol-01ad1fe87cbeb4a38)
# Unmanaged AWS resource (not found in HCL configuration). Decommissioned out-of-band.
# TOMBSTONED by CloudPulse (FinOps Remediation) — cloudpulse-zombie-vol (vol-02f8da166848b65bc)
# Unmanaged AWS resource (not found in HCL configuration). Decommissioned out-of-band.
# TOMBSTONED by CloudPulse (FinOps Remediation) — cloudpulse-zombie-eip-2026-09-15 (eipalloc-050c132df2341fedf)
# Unmanaged AWS resource (not found in HCL configuration). Decommissioned out-of-band.
# TOMBSTONED by CloudPulse (FinOps Remediation) — cloudpulse-zombie-eip (eipalloc-0bd2e01043721d5d7)
# Unmanaged AWS resource (not found in HCL configuration). Decommissioned out-of-band.
# TOMBSTONED by CloudPulse (FinOps Remediation) — cloudpulse-zombie-eip-2026-09-16 (eipalloc-09cd8d4c528267722)
# Unmanaged AWS resource (not found in HCL configuration). Decommissioned out-of-band.
# TOMBSTONED by CloudPulse (FinOps Remediation) — cloudpulse-zombie-vol-2026-09-16 (vol-0a2ba865cc8b2b35d)
# Unmanaged AWS resource (not found in HCL configuration). Decommissioned out-of-band.
# TOMBSTONED by CloudPulse (FinOps Remediation) — cloudpulse-zombie-vol-2026-09-15 (vol-01ad1fe87cbeb4a38)
# Unmanaged AWS resource (not found in HCL configuration). Decommissioned out-of-band.
# TOMBSTONED by CloudPulse (FinOps Remediation) — cloudpulse-zombie-vol (vol-02f8da166848b65bc)
# Unmanaged AWS resource (not found in HCL configuration). Decommissioned out-of-band.
# TOMBSTONED by CloudPulse (FinOps Remediation) — cloudpulse-zombie-eip-2026-09-16 (eipalloc-09cd8d4c528267722)
# Unmanaged AWS resource (not found in HCL configuration). Decommissioned out-of-band.
# TOMBSTONED by CloudPulse (FinOps Remediation) — cloudpulse-zombie-vol (vol-02f8da166848b65bc)
# Unmanaged AWS resource: delete during the next Terraform apply.
resource "terraform_data" "cloudpulse_remediate_vol_02f8da166848b65bc" {
  triggers_replace = ["vol-02f8da166848b65bc"]

  provisioner "local-exec" {
    command = <<-EOT
      volume_id="vol-02f8da166848b65bc"
      if aws ec2 describe-volumes --volume-ids "$volume_id" --query 'Volumes[0].VolumeId' --output text 2>/dev/null | grep -q '^vol-'; then
        aws ec2 delete-volume --volume-id "$volume_id"
      fi
    EOT
  }
}
# TOMBSTONED by CloudPulse (FinOps Remediation) — cloudpulse-zombie-vol-2026-09-15 (vol-01ad1fe87cbeb4a38)
# Unmanaged AWS resource: delete during the next Terraform apply.
resource "terraform_data" "cloudpulse_remediate_vol_01ad1fe87cbeb4a38" {
  triggers_replace = ["vol-01ad1fe87cbeb4a38"]

  provisioner "local-exec" {
    command = <<-EOT
      volume_id="vol-01ad1fe87cbeb4a38"
      if aws ec2 describe-volumes --volume-ids "$volume_id" --query 'Volumes[0].VolumeId' --output text 2>/dev/null | grep -q '^vol-'; then
        aws ec2 delete-volume --volume-id "$volume_id"
      fi
    EOT
  }
}
# TOMBSTONED by CloudPulse (FinOps Remediation) — cloudpulse-zombie-vol-2026-09-16 (vol-0a2ba865cc8b2b35d)
# Unmanaged AWS resource: delete during the next Terraform apply.
resource "terraform_data" "cloudpulse_remediate_vol_0a2ba865cc8b2b35d" {
  triggers_replace = ["vol-0a2ba865cc8b2b35d"]

  provisioner "local-exec" {
    command = <<-EOT
      volume_id="vol-0a2ba865cc8b2b35d"
      if aws ec2 describe-volumes --volume-ids "$volume_id" --query 'Volumes[0].VolumeId' --output text 2>/dev/null | grep -q '^vol-'; then
        aws ec2 delete-volume --volume-id "$volume_id"
      fi
    EOT
  }
}
# TOMBSTONED by CloudPulse (FinOps Remediation) — cloudpulse-zombie-eip-2026-09-16 (eipalloc-09cd8d4c528267722)
# Unmanaged AWS resource: release during the next Terraform apply.
resource "terraform_data" "cloudpulse_remediate_eipalloc_09cd8d4c528267722" {
  triggers_replace = ["eipalloc-09cd8d4c528267722"]

  provisioner "local-exec" {
    command = <<-EOT
      allocation_id="eipalloc-09cd8d4c528267722"
      if aws ec2 describe-addresses --allocation-ids "$allocation_id" --query 'Addresses[0].AllocationId' --output text 2>/dev/null | grep -q '^eipalloc-'; then
        aws ec2 release-address --allocation-id "$allocation_id"
      fi
    EOT
  }
}
# TOMBSTONED by CloudPulse (FinOps Remediation) — cloudpulse-zombie-eip (eipalloc-0bd2e01043721d5d7)
# Unmanaged AWS resource: release during the next Terraform apply.
resource "terraform_data" "cloudpulse_remediate_eipalloc_0bd2e01043721d5d7" {
  triggers_replace = ["eipalloc-0bd2e01043721d5d7"]

  provisioner "local-exec" {
    command = <<-EOT
      allocation_id="eipalloc-0bd2e01043721d5d7"
      if aws ec2 describe-addresses --allocation-ids "$allocation_id" --query 'Addresses[0].AllocationId' --output text 2>/dev/null | grep -q '^eipalloc-'; then
        aws ec2 release-address --allocation-id "$allocation_id"
      fi
    EOT
  }
}
# TOMBSTONED by CloudPulse (FinOps Remediation) — cloudpulse-zombie-eip-2026-09-15 (eipalloc-050c132df2341fedf)
# Unmanaged AWS resource: release during the next Terraform apply.
resource "terraform_data" "cloudpulse_remediate_eipalloc_050c132df2341fedf" {
  triggers_replace = ["eipalloc-050c132df2341fedf"]

  provisioner "local-exec" {
    command = <<-EOT
      allocation_id="eipalloc-050c132df2341fedf"
      if aws ec2 describe-addresses --allocation-ids "$allocation_id" --query 'Addresses[0].AllocationId' --output text 2>/dev/null | grep -q '^eipalloc-'; then
        aws ec2 release-address --allocation-id "$allocation_id"
      fi
    EOT
  }
}

# Managed Zombie Fixture — 2026-09-16 (v2)
resource "aws_ebs_volume" "cloudpulse_zombie_vol_2026_09_16_v2" {
  availability_zone = "eu-west-1a"
  size              = 1
  type              = "gp3"

  tags = {
    Name        = "cloudpulse-zombie-vol-2026-09-16-v2-tf"
    Environment = "sandbox"
    ManagedBy   = "Terraform"
  }
}

resource "aws_eip" "cloudpulse_zombie_eip_2026_09_16_v2" {
  domain = "vpc"

  tags = {
    Name        = "cloudpulse-zombie-eip-2026-09-16-v2-tf"
    Environment = "sandbox"
    ManagedBy   = "Terraform"
  }
}

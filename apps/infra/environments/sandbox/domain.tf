data "aws_route53_zone" "primary" {
  name         = "cloudpulse-ops.com"
  private_zone = false
}

resource "aws_acm_certificate" "cert" {
  domain_name               = "cloudpulse-ops.com"
  validation_method         = "DNS"
  subject_alternative_names = ["*.cloudpulse-ops.com"]

  tags = {
    Name        = "cloudpulse-ops.com"
    Environment = "sandbox"
    ManagedBy   = "Terraform"
  }

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_route53_record" "cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.cert.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = data.aws_route53_zone.primary.zone_id
}

resource "aws_acm_certificate_validation" "cert" {
  certificate_arn         = aws_acm_certificate.cert.arn
  validation_record_fqdns = [for record in aws_route53_record.cert_validation : record.fqdn]
}

resource "aws_route53_record" "apex" {
  zone_id = data.aws_route53_zone.primary.zone_id
  name    = "cloudpulse-ops.com"
  type    = "A"

  alias {
    name                   = aws_lb.alb.dns_name
    zone_id                = aws_lb.alb.zone_id
    evaluate_target_health = true
  }
}

resource "aws_route53_record" "www" {
  zone_id = data.aws_route53_zone.primary.zone_id
  name    = "www.cloudpulse-ops.com"
  type    = "A"

  alias {
    name                   = aws_lb.alb.dns_name
    zone_id                = aws_lb.alb.zone_id
    evaluate_target_health = true
  }
}

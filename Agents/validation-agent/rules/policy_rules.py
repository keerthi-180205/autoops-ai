"""
Policy Rules — hardcoded cost-control and policy checks.
These run BEFORE any LLM or AWS call.

Rules enforced:
  - Allowed regions: ap-south-1 and us-east-1 only.
  - EC2: Block instance types larger than t2.medium.
  - IAM: Block wildcard (*) admin policy attachments.
"""

# Allowed AWS regions
ALLOWED_REGIONS = {"ap-south-1", "us-east-1"}

# EC2 instance type size order (smallest to largest)
# Anything above t2.medium is blocked.
BLOCKED_EC2_INSTANCE_TYPES = {
    "t2.large", "t2.xlarge", "t2.2xlarge",
    "t3.large", "t3.xlarge", "t3.2xlarge",
    "m5.large", "m5.xlarge", "m5.2xlarge", "m5.4xlarge", "m5.8xlarge",
    "m5.12xlarge", "m5.16xlarge", "m5.24xlarge",
    "c5.large", "c5.xlarge", "c5.2xlarge", "c5.4xlarge",
    "r5.large", "r5.xlarge", "r5.2xlarge", "r5.4xlarge",
    "p3.2xlarge", "p3.8xlarge", "p3.16xlarge",
    "g4dn.xlarge", "g4dn.2xlarge",
    "inf1.xlarge", "inf1.2xlarge",
}


def check_region(parameters: dict) -> list[str]:
    """Return a list of violations if the region is not allowed."""
    violations = []
    region = parameters.get("Region") or parameters.get("region")
    if region and region not in ALLOWED_REGIONS:
        violations.append(
            f"Region '{region}' is not in the allowed regions list: "
            f"{sorted(ALLOWED_REGIONS)}."
        )
    return violations


def check_ec2_instance_type(parameters: dict) -> list[str]:
    """Return a list of violations if the EC2 instance type exceeds the limit."""
    violations = []
    instance_type = parameters.get("InstanceType")
    if instance_type and instance_type in BLOCKED_EC2_INSTANCE_TYPES:
        violations.append(
            f"Instance type '{instance_type}' exceeds the allowed limit "
            f"(max: t2.medium)."
        )
    return violations


def check_iam_wildcard_policy(parameters: dict) -> list[str]:
    """Block attaching wildcard (*) admin policies."""
    violations = []
    policy_arn = parameters.get("PolicyArn", "")
    if "AdministratorAccess" in policy_arn or policy_arn == "*":
        violations.append(
            f"Attaching the policy '{policy_arn}' is not allowed. "
            "Full administrator access is restricted."
        )
    return violations


def run_policy_checks(service: str, action: str, parameters: dict) -> list[str]:
    """
    Run all applicable policy checks and return a combined list of violations.

    Args:
        service: AWS service (s3, ec2, iam).
        action: Action being performed.
        parameters: Parameters from the execution plan.

    Returns:
        List of violation strings. Empty list means all checks passed.
    """
    violations = []

    # Region check applies to all services
    violations.extend(check_region(parameters))

    # EC2-specific checks
    if service == "ec2":
        violations.extend(check_ec2_instance_type(parameters))

    # IAM-specific checks
    if service == "iam" and action == "attachuserpolicy":
        violations.extend(check_iam_wildcard_policy(parameters))

    return violations

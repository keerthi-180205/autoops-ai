"""
Security Rules — hardcoded security and compliance checks.
These run BEFORE any LLM or AWS call.

Rules enforced:
  - No S3 bucket names that suggest public access (e.g., "public-", "open-").
  - No S3 bucket names that are too generic (less than 5 characters).
  - No EC2 instances launched without a min/max count sanity check.
  - No IAM roles with overly permissive trust policies.
"""


def check_s3_bucket_name_security(parameters: dict) -> list[str]:
    """Flag S3 bucket names that suggest insecure or public access."""
    violations = []
    bucket = parameters.get("Bucket", "")

    if len(bucket) < 5:
        violations.append(
            f"S3 bucket name '{bucket}' is too short (minimum 5 characters). "
            "Use a descriptive, unique name."
        )

    insecure_prefixes = ("public-", "open-", "world-", "everyone-", "anon-")
    if any(bucket.lower().startswith(prefix) for prefix in insecure_prefixes):
        violations.append(
            f"S3 bucket name '{bucket}' suggests public access, which is not allowed. "
            "Rename the bucket to avoid public-access-implying names."
        )

    return violations


def check_ec2_instance_count(parameters: dict) -> list[str]:
    """Ensure EC2 instance launch counts are within safe limits."""
    violations = []
    max_count = parameters.get("MaxCount", 1)

    try:
        if int(max_count) > 5:
            violations.append(
                f"Requested MaxCount of {max_count} exceeds the allowed limit of 5 instances "
                "per launch for cost-safety reasons."
            )
    except (ValueError, TypeError):
        violations.append(f"Invalid MaxCount value: '{max_count}'. Must be an integer.")

    return violations


def check_iam_role_trust_policy(parameters: dict) -> list[str]:
    """Flag IAM roles with wildcard trust policies."""
    violations = []
    assume_role_policy = parameters.get("AssumeRolePolicyDocument", "")

    if '"AWS": "*"' in assume_role_policy or "'AWS': '*'" in assume_role_policy:
        violations.append(
            "IAM role trust policy allows all AWS principals ('*'). "
            "This is overly permissive and not allowed."
        )

    return violations


def run_security_checks(service: str, action: str, parameters: dict) -> list[str]:
    """
    Run all applicable security checks and return a combined list of violations.

    Args:
        service: AWS service (s3, ec2, iam).
        action: Action being performed.
        parameters: Parameters from the execution plan.

    Returns:
        List of violation strings. Empty list means all checks passed.
    """
    violations = []

    if service == "s3" and action in ("create_bucket", "upload_object"):
        violations.extend(check_s3_bucket_name_security(parameters))

    if service == "ec2" and action == "run_instances":
        violations.extend(check_ec2_instance_count(parameters))

    if service == "iam" and action == "create_role":
        violations.extend(check_iam_role_trust_policy(parameters))

    return violations

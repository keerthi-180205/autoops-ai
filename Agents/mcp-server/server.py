"""
AUTOops MCP Server
==================
Exposes AWS infrastructure tools via the Model Context Protocol (MCP).
Any MCP-compatible LLM client (Claude Desktop, Cursor, etc.) can call these
tools to create, list, and destroy EC2 instances and S3 buckets.

Uses the same boto3 handlers as the AUTOops worker-agent — zero AI, pure
deterministic execution.
"""

import os
import json
from fastmcp import FastMCP

# Import the existing worker-agent handlers
from handlers import ec2_handler, s3_handler, iam_handler

# ── Server ──────────────────────────────────────────────────────────────────
mcp = FastMCP(
    "AUTOops",
    instructions="AWS Infrastructure Orchestrator — create, list, and destroy cloud resources via MCP tools.",
)

# ═══════════════════════════════════════════════════════════════════════════
#  EC2 Tools
# ═══════════════════════════════════════════════════════════════════════════

@mcp.tool()
def create_ec2_instance(
    image_id: str = "",
    instance_type: str = "t3.micro",
    region: str = "ap-south-1",
    key_name: str = "",
    name_tag: str = "",
) -> str:
    """
    Launch a new EC2 instance on AWS.

    Args:
        image_id: AMI ID (e.g. ami-0dee22c13ea7a9a67 for Ubuntu in ap-south-1).
                  Leave empty to use the region default.
        instance_type: EC2 instance type (e.g. t2.micro, t3.micro, t3.small).
        region: AWS region (e.g. ap-south-1, us-east-1).
        key_name: SSH key pair name. Leave empty for no key pair.
        name_tag: Name tag for the instance. Leave empty for no name.

    Returns:
        JSON with instance ID, public IP, private IP, state, and launch time.
    """
    os.environ["AWS_REGION"] = region

    params = {
        "InstanceType": instance_type,
        "MinCount": 1,
        "MaxCount": 1,
        "Region": region,
    }
    if image_id:
        params["ImageId"] = image_id
    if key_name:
        params["KeyName"] = key_name
    if name_tag:
        params["TagSpecifications"] = [
            {
                "ResourceType": "instance",
                "Tags": [{"Key": "Name", "Value": name_tag}],
            }
        ]

    result = ec2_handler.run_instances(params)
    return json.dumps(result, indent=2, default=str)


@mcp.tool()
def list_ec2_instances(region: str = "ap-south-1") -> str:
    """
    List all EC2 instances in a region with their IDs, states, IPs, and types.

    Args:
        region: AWS region to query (e.g. ap-south-1, us-east-1).

    Returns:
        JSON array of instance details.
    """
    os.environ["AWS_REGION"] = region
    result = ec2_handler.describe_instances({})
    return json.dumps(result, indent=2, default=str)


@mcp.tool()
def stop_ec2_instance(instance_id: str, region: str = "ap-south-1") -> str:
    """
    Stop a running EC2 instance.

    Args:
        instance_id: The EC2 instance ID (e.g. i-0abc123def456).
        region: AWS region where the instance lives.

    Returns:
        JSON status of the stop operation.
    """
    os.environ["AWS_REGION"] = region
    result = ec2_handler.stop_instances({"InstanceIds": [instance_id], "Region": region})
    return json.dumps(result, indent=2, default=str)


@mcp.tool()
def start_ec2_instance(instance_id: str, region: str = "ap-south-1") -> str:
    """
    Start a stopped EC2 instance.

    Args:
        instance_id: The EC2 instance ID (e.g. i-0abc123def456).
        region: AWS region where the instance lives.

    Returns:
        JSON status of the start operation.
    """
    os.environ["AWS_REGION"] = region
    result = ec2_handler.start_instances({"InstanceIds": [instance_id], "Region": region})
    return json.dumps(result, indent=2, default=str)


@mcp.tool()
def terminate_ec2_instance(instance_id: str, region: str = "ap-south-1") -> str:
    """
    Permanently terminate (destroy) an EC2 instance.

    Args:
        instance_id: The EC2 instance ID (e.g. i-0abc123def456).
        region: AWS region where the instance lives.

    Returns:
        JSON status of the termination.
    """
    os.environ["AWS_REGION"] = region
    result = ec2_handler.terminate_instances({"InstanceIds": [instance_id], "Region": region})
    return json.dumps(result, indent=2, default=str)


# ═══════════════════════════════════════════════════════════════════════════
#  S3 Tools
# ═══════════════════════════════════════════════════════════════════════════

@mcp.tool()
def create_s3_bucket(bucket_name: str, region: str = "ap-south-1") -> str:
    """
    Create a new S3 bucket on AWS.

    Args:
        bucket_name: Globally unique bucket name (lowercase, no underscores).
        region: AWS region for the bucket (e.g. ap-south-1, us-east-1).

    Returns:
        JSON with the created bucket name.
    """
    result = s3_handler.create_bucket({"Bucket": bucket_name, "Region": region})
    return json.dumps(result, indent=2, default=str)


@mcp.tool()
def list_s3_buckets(region: str = "ap-south-1") -> str:
    """
    List all S3 buckets in the AWS account.

    Args:
        region: AWS region to use for the API call.

    Returns:
        JSON array of bucket names.
    """
    result = s3_handler.list_buckets({"Region": region})
    return json.dumps(result, indent=2, default=str)


@mcp.tool()
def delete_s3_bucket(bucket_name: str, region: str = "ap-south-1") -> str:
    """
    Delete an S3 bucket (must be empty).

    Args:
        bucket_name: Name of the bucket to delete.
        region: AWS region where the bucket exists.

    Returns:
        JSON status of the deletion.
    """
    result = s3_handler.delete_bucket({"Bucket": bucket_name, "Region": region})
    return json.dumps(result, indent=2, default=str)


# ═══════════════════════════════════════════════════════════════════════════
#  IAM Tools
# ═══════════════════════════════════════════════════════════════════════════

@mcp.tool()
def create_iam_user(username: str) -> str:
    """
    Create a new IAM user.

    Args:
        username: The IAM username to create.

    Returns:
        JSON with the created user details.
    """
    result = iam_handler.create_user({"UserName": username})
    return json.dumps(result, indent=2, default=str)


@mcp.tool()
def list_iam_users() -> str:
    """
    List all IAM users in the AWS account.

    Returns:
        JSON array of IAM user details.
    """
    result = iam_handler.list_users({})
    return json.dumps(result, indent=2, default=str)


@mcp.tool()
def delete_iam_user(username: str) -> str:
    """
    Delete an IAM user.

    Args:
        username: The IAM username to delete.

    Returns:
        JSON status of the deletion.
    """
    result = iam_handler.delete_user({"UserName": username})
    return json.dumps(result, indent=2, default=str)


# ═══════════════════════════════════════════════════════════════════════════
#  Entry Point
# ═══════════════════════════════════════════════════════════════════════════
if __name__ == "__main__":
    mcp.run()

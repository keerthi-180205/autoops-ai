"""
EC2 Handler — maps validated JSON plans to boto3 EC2 API calls.
NO AI, NO LLMs. Pure if/else and try/except.
"""

import os
import boto3
from botocore.exceptions import ClientError


def _ec2_client():
    """Create and return a boto3 EC2 client (reads creds from environment)."""
    return boto3.client("ec2", region_name=os.environ.get("AWS_REGION", "us-east-1"))


def run_instances(parameters: dict) -> dict:
    image_id = parameters.get("ImageId")
    instance_type = parameters.get("InstanceType", "t2.micro")
    min_count = parameters.get("MinCount", 1)
    max_count = parameters.get("MaxCount", 1)

    if not image_id:
        return {"status": "failed", "error": "Missing required parameter: ImageId"}

    try:
        response = _ec2_client().run_instances(
            ImageId=image_id,
            InstanceType=instance_type,
            MinCount=int(min_count),
            MaxCount=int(max_count),
        )
        instance_ids = [i["InstanceId"] for i in response.get("Instances", [])]
        return {"status": "success", "resource_id": ", ".join(instance_ids)}
    except ClientError as e:
        return {"status": "failed", "error": f"AWS Error: {e.response['Error']['Message']}"}
    except Exception as e:
        return {"status": "failed", "error": str(e)}


def stop_instances(parameters: dict) -> dict:
    ids = parameters.get("InstanceIds", [])
    if not ids:
        return {"status": "failed", "error": "Missing required parameter: InstanceIds"}
    try:
        _ec2_client().stop_instances(InstanceIds=ids)
        return {"status": "success", "resource_id": ", ".join(ids)}
    except ClientError as e:
        return {"status": "failed", "error": f"AWS Error: {e.response['Error']['Message']}"}
    except Exception as e:
        return {"status": "failed", "error": str(e)}


def start_instances(parameters: dict) -> dict:
    ids = parameters.get("InstanceIds", [])
    if not ids:
        return {"status": "failed", "error": "Missing required parameter: InstanceIds"}
    try:
        _ec2_client().start_instances(InstanceIds=ids)
        return {"status": "success", "resource_id": ", ".join(ids)}
    except ClientError as e:
        return {"status": "failed", "error": f"AWS Error: {e.response['Error']['Message']}"}
    except Exception as e:
        return {"status": "failed", "error": str(e)}


def terminate_instances(parameters: dict) -> dict:
    ids = parameters.get("InstanceIds", [])
    if not ids:
        return {"status": "failed", "error": "Missing required parameter: InstanceIds"}
    try:
        _ec2_client().terminate_instances(InstanceIds=ids)
        return {"status": "success", "resource_id": ", ".join(ids)}
    except ClientError as e:
        return {"status": "failed", "error": f"AWS Error: {e.response['Error']['Message']}"}
    except Exception as e:
        return {"status": "failed", "error": str(e)}


def describe_instances(parameters: dict) -> dict:
    try:
        response = _ec2_client().describe_instances()
        instances = []
        for reservation in response.get("Reservations", []):
            for inst in reservation.get("Instances", []):
                instances.append({
                    "InstanceId": inst.get("InstanceId"),
                    "State": inst.get("State", {}).get("Name"),
                    "InstanceType": inst.get("InstanceType"),
                })
        return {"status": "success", "resource_id": "list", "instances": instances}
    except ClientError as e:
        return {"status": "failed", "error": f"AWS Error: {e.response['Error']['Message']}"}
    except Exception as e:
        return {"status": "failed", "error": str(e)}

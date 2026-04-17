"""
EC2 Handler — maps validated JSON plans to boto3 EC2 API calls.
Returns detailed resource information after creation.
NO AI, NO LLMs. Pure if/else and try/except.
"""

import os
import time
import boto3
from botocore.exceptions import ClientError


def _ec2_client(region=None):
    """Create and return a boto3 EC2 client (reads creds from environment)."""
    return boto3.client("ec2", region_name=region or os.environ.get("AWS_REGION", "us-east-1"))


def _get_instance_details(client, instance_id: str, max_retries: int = 5) -> dict:
    """
    Fetch detailed info for an instance. Polls up to max_retries times
    waiting for the public IP to be assigned.
    """
    details = {
        "InstanceId": instance_id,
        "InstanceType": "unknown",
        "Region": os.environ.get("AWS_REGION", "us-east-1"),
        "PublicIp": "Pending...",
        "PrivateIp": "Pending...",
        "State": "pending",
        "LaunchTime": "",
        "KeyName": "None",
    }

    for attempt in range(max_retries):
        try:
            resp = client.describe_instances(InstanceIds=[instance_id])
            inst = resp["Reservations"][0]["Instances"][0]

            details["InstanceType"] = inst.get("InstanceType", "unknown")
            details["State"] = inst.get("State", {}).get("Name", "unknown")
            details["PrivateIp"] = inst.get("PrivateIpAddress", "N/A")
            details["KeyName"] = inst.get("KeyName", "None")
            details["LaunchTime"] = str(inst.get("LaunchTime", ""))

            public_ip = inst.get("PublicIpAddress")
            if public_ip:
                details["PublicIp"] = public_ip
                return details

            # If instance is running but no public IP yet, wait and retry
            if inst.get("State", {}).get("Name") == "running" and not public_ip:
                details["PublicIp"] = "No public IP (instance may be in private subnet)"
                return details

        except Exception:
            pass

        if attempt < max_retries - 1:
            time.sleep(3)

    return details


def run_instances(parameters: dict) -> dict:
    image_id = parameters.get("ImageId") or parameters.get("image_id")
    instance_type = parameters.get("InstanceType") or parameters.get("instance_type", "t3.micro")
    min_count = parameters.get("MinCount") or parameters.get("min_count", 1)
    max_count = parameters.get("MaxCount") or parameters.get("max_count", 1)
    key_name = parameters.get("KeyName")

    if not image_id:
        region = os.environ.get("AWS_REGION", "us-east-1")
        default_amis = {
            "us-east-1": "ami-0c101f26f147fa7fd",
            "us-west-2": "ami-0ceecbb0f30a902a6",
            "ap-south-1": "ami-0da59f1af71ea4ad2",
        }
        image_id = default_amis.get(region)
        if not image_id:
            return {"status": "failed", "error": f"No default AMI mapped for region {region}. Please specify ImageId."}

    try:
        region = parameters.get("Region") or parameters.get("region")
        client = _ec2_client(region)

        run_kwargs = {
            "ImageId": image_id,
            "InstanceType": instance_type,
            "MinCount": int(min_count),
            "MaxCount": int(max_count),
        }
        if key_name and key_name.lower() not in ("", "none", "no"):
            run_kwargs["KeyName"] = key_name

        response = client.run_instances(**run_kwargs)
        instance_ids = [i["InstanceId"] for i in response.get("Instances", [])]

        if not instance_ids:
            return {"status": "failed", "error": "No instances were created."}

        # Wait a moment for AWS to register the instance, then fetch details
        time.sleep(5)
        details = _get_instance_details(client, instance_ids[0])

        return {
            "status": "success",
            "resource_id": ", ".join(instance_ids),
            "details": details,
        }
    except ClientError as e:
        return {"status": "failed", "error": f"AWS Error: {e.response['Error']['Message']}"}
    except Exception as e:
        return {"status": "failed", "error": str(e)}


def stop_instances(parameters: dict) -> dict:
    ids = parameters.get("InstanceIds", [])
    if not ids:
        return {"status": "failed", "error": "Missing required parameter: InstanceIds"}
    try:
        region = parameters.get("Region") or parameters.get("region")
        _ec2_client(region).stop_instances(InstanceIds=ids)
        return {"status": "success", "resource_id": ", ".join(ids), "details": {"action": "stop", "InstanceIds": ids}}
    except ClientError as e:
        return {"status": "failed", "error": f"AWS Error: {e.response['Error']['Message']}"}
    except Exception as e:
        return {"status": "failed", "error": str(e)}


def start_instances(parameters: dict) -> dict:
    ids = parameters.get("InstanceIds", [])
    if not ids:
        return {"status": "failed", "error": "Missing required parameter: InstanceIds"}
    try:
        region = parameters.get("Region") or parameters.get("region")
        _ec2_client(region).start_instances(InstanceIds=ids)
        return {"status": "success", "resource_id": ", ".join(ids), "details": {"action": "start", "InstanceIds": ids}}
    except ClientError as e:
        return {"status": "failed", "error": f"AWS Error: {e.response['Error']['Message']}"}
    except Exception as e:
        return {"status": "failed", "error": str(e)}


def terminate_instances(parameters: dict) -> dict:
    ids = parameters.get("InstanceIds", [])
    if not ids:
        return {"status": "failed", "error": "Missing required parameter: InstanceIds"}
    try:
        region = parameters.get("Region") or parameters.get("region")
        _ec2_client(region).terminate_instances(InstanceIds=ids)
        return {"status": "success", "resource_id": ", ".join(ids), "details": {"action": "terminate", "InstanceIds": ids}}
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
                    "PublicIp": inst.get("PublicIpAddress", "N/A"),
                    "PrivateIp": inst.get("PrivateIpAddress", "N/A"),
                    "LaunchTime": str(inst.get("LaunchTime", "")),
                })
        return {"status": "success", "resource_id": "list", "details": {"instances": instances}}
    except ClientError as e:
        return {"status": "failed", "error": f"AWS Error: {e.response['Error']['Message']}"}
    except Exception as e:
        return {"status": "failed", "error": str(e)}

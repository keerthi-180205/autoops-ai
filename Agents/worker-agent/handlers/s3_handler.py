"""
S3 Handler — maps validated JSON plans to boto3 S3 API calls.
NO AI, NO LLMs. Pure if/else and try/except.
"""

import os
import boto3
from botocore.exceptions import ClientError


def _s3_client():
    """Create and return a boto3 S3 client (reads creds from environment)."""
    return boto3.client("s3", region_name=os.environ.get("AWS_REGION", "us-east-1"))


def create_bucket(parameters: dict) -> dict:
    bucket = parameters.get("Bucket")
    region = parameters.get("Region", "us-east-1")

    if not bucket:
        return {"status": "failed", "error": "Missing required parameter: Bucket"}

    try:
        client = _s3_client()
        if region == "us-east-1":
            # us-east-1 does NOT accept a LocationConstraint
            client.create_bucket(Bucket=bucket)
        else:
            client.create_bucket(
                Bucket=bucket,
                CreateBucketConfiguration={"LocationConstraint": region},
            )
        return {"status": "success", "resource_id": bucket}
    except ClientError as e:
        return {"status": "failed", "error": f"AWS Error: {e.response['Error']['Message']}"}
    except Exception as e:
        return {"status": "failed", "error": str(e)}


def delete_bucket(parameters: dict) -> dict:
    bucket = parameters.get("Bucket")
    if not bucket:
        return {"status": "failed", "error": "Missing required parameter: Bucket"}
    try:
        _s3_client().delete_bucket(Bucket=bucket)
        return {"status": "success", "resource_id": bucket}
    except ClientError as e:
        return {"status": "failed", "error": f"AWS Error: {e.response['Error']['Message']}"}
    except Exception as e:
        return {"status": "failed", "error": str(e)}


def list_buckets(parameters: dict) -> dict:
    try:
        response = _s3_client().list_buckets()
        buckets = [b["Name"] for b in response.get("Buckets", [])]
        return {"status": "success", "resource_id": "list", "buckets": buckets}
    except ClientError as e:
        return {"status": "failed", "error": f"AWS Error: {e.response['Error']['Message']}"}
    except Exception as e:
        return {"status": "failed", "error": str(e)}


def upload_object(parameters: dict) -> dict:
    bucket = parameters.get("Bucket")
    key = parameters.get("Key")
    body = parameters.get("Body", "")
    if not bucket or not key:
        return {"status": "failed", "error": "Missing required parameters: Bucket, Key"}
    try:
        _s3_client().put_object(Bucket=bucket, Key=key, Body=body.encode())
        return {"status": "success", "resource_id": f"{bucket}/{key}"}
    except ClientError as e:
        return {"status": "failed", "error": f"AWS Error: {e.response['Error']['Message']}"}
    except Exception as e:
        return {"status": "failed", "error": str(e)}


def delete_object(parameters: dict) -> dict:
    bucket = parameters.get("Bucket")
    key = parameters.get("Key")
    if not bucket or not key:
        return {"status": "failed", "error": "Missing required parameters: Bucket, Key"}
    try:
        _s3_client().delete_object(Bucket=bucket, Key=key)
        return {"status": "success", "resource_id": f"{bucket}/{key}"}
    except ClientError as e:
        return {"status": "failed", "error": f"AWS Error: {e.response['Error']['Message']}"}
    except Exception as e:
        return {"status": "failed", "error": str(e)}

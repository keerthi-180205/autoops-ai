"""
IAM Handler — maps validated JSON plans to boto3 IAM API calls.
NO AI, NO LLMs. Pure if/else and try/except.
"""

import boto3
from botocore.exceptions import ClientError


def _iam_client():
    """Create and return a boto3 IAM client (reads creds from environment)."""
    return boto3.client("iam")


def create_user(parameters: dict) -> dict:
    username = parameters.get("UserName")
    if not username:
        return {"status": "failed", "error": "Missing required parameter: UserName"}
    try:
        _iam_client().create_user(UserName=username)
        return {"status": "success", "resource_id": username}
    except ClientError as e:
        return {"status": "failed", "error": f"AWS Error: {e.response['Error']['Message']}"}
    except Exception as e:
        return {"status": "failed", "error": str(e)}


def delete_user(parameters: dict) -> dict:
    username = parameters.get("UserName")
    if not username:
        return {"status": "failed", "error": "Missing required parameter: UserName"}
    try:
        _iam_client().delete_user(UserName=username)
        return {"status": "success", "resource_id": username}
    except ClientError as e:
        return {"status": "failed", "error": f"AWS Error: {e.response['Error']['Message']}"}
    except Exception as e:
        return {"status": "failed", "error": str(e)}


def list_users(parameters: dict) -> dict:
    try:
        response = _iam_client().list_users()
        users = [u["UserName"] for u in response.get("Users", [])]
        return {"status": "success", "resource_id": "list", "users": users}
    except ClientError as e:
        return {"status": "failed", "error": f"AWS Error: {e.response['Error']['Message']}"}
    except Exception as e:
        return {"status": "failed", "error": str(e)}


def attach_user_policy(parameters: dict) -> dict:
    username = parameters.get("UserName")
    policy_arn = parameters.get("PolicyArn")
    if not username or not policy_arn:
        return {"status": "failed", "error": "Missing required parameters: UserName, PolicyArn"}
    try:
        _iam_client().attach_user_policy(UserName=username, PolicyArn=policy_arn)
        return {"status": "success", "resource_id": f"{username}:{policy_arn}"}
    except ClientError as e:
        return {"status": "failed", "error": f"AWS Error: {e.response['Error']['Message']}"}
    except Exception as e:
        return {"status": "failed", "error": str(e)}


def create_role(parameters: dict) -> dict:
    role_name = parameters.get("RoleName")
    assume_role_policy = parameters.get("AssumeRolePolicyDocument")
    if not role_name or not assume_role_policy:
        return {
            "status": "failed",
            "error": "Missing required parameters: RoleName, AssumeRolePolicyDocument",
        }
    try:
        _iam_client().create_role(
            RoleName=role_name,
            AssumeRolePolicyDocument=assume_role_policy,
        )
        return {"status": "success", "resource_id": role_name}
    except ClientError as e:
        return {"status": "failed", "error": f"AWS Error: {e.response['Error']['Message']}"}
    except Exception as e:
        return {"status": "failed", "error": str(e)}

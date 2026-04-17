"""
Pydantic schemas for the Master Agent.
Validates all input from the backend and all output before sending downstream.
"""

from typing import Any, Dict, Literal
from pydantic import BaseModel, Field


class PlanRequest(BaseModel):
    """Input payload received from the Backend for POST /plan."""
    prompt: str = Field(
        ...,
        min_length=3,
        description="Natural-language instruction describing the desired AWS operation.",
        examples=["Create an S3 bucket named my-bucket in us-east-1"],
    )


class PlanResponse(BaseModel):
    """
    Structured JSON plan output returned to the Backend.
    Mirrors what the Worker Agent consumes via POST /execute.
    """
    service: str = Field(
        ...,
        description="Target AWS service: s3, ec2, or iam.",
        examples=["s3"],
    )
    action: str = Field(
        ...,
        description="Specific action to perform on the service.",
        examples=["create_bucket"],
    )
    parameters: Dict[str, Any] = Field(
        default_factory=dict,
        description="Key-value pairs required by the action.",
    )


class ErrorResponse(BaseModel):
    """Standard error envelope returned when planning fails."""
    status: Literal["error"] = "error"
    message: str

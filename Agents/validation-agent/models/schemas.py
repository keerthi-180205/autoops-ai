"""
Pydantic schemas for the Validation Agent.
"""

from typing import Any, Dict, List
from pydantic import BaseModel, Field


class ValidateRequest(BaseModel):
    """Input payload received from the Backend for POST /validate."""
    service: str = Field(..., description="AWS service: s3, ec2, or iam.")
    action: str = Field(..., description="Action to be performed.")
    parameters: Dict[str, Any] = Field(
        default_factory=dict,
        description="Parameters from the execution plan.",
    )


class ValidateResponse(BaseModel):
    """Structured validation result returned to the Backend."""
    approved: bool = Field(
        ...,
        description="True if the plan is approved, False if rejected.",
    )
    reasons: List[str] = Field(
        default_factory=list,
        description="List of rejection reasons. Empty if approved.",
    )

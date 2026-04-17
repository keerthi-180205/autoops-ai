"""
Pydantic schemas for the Pricing Agent.
"""

from typing import Any, Dict, Optional
from pydantic import BaseModel, Field


class EstimateRequest(BaseModel):
    """Input payload received from the Backend for POST /estimate."""
    service: str = Field(..., description="AWS service: s3, ec2, or iam.")
    action: str = Field(..., description="Action to be performed.")
    parameters: Dict[str, Any] = Field(
        default_factory=dict,
        description="Parameters for the action.",
    )


class EstimateResponse(BaseModel):
    """Structured cost estimate returned to the Backend."""
    service: str = Field(..., description="AWS service name.")
    estimated_monthly_cost_usd: Optional[float] = Field(
        None,
        description="Estimated monthly cost in USD. None if unknown.",
    )
    breakdown: str = Field(
        ...,
        description="Human-readable explanation of the cost breakdown.",
    )
    warning: str = Field(
        default="Estimate only. Actual cost may vary.",
        description="Disclaimer shown to the user.",
    )


class ErrorResponse(BaseModel):
    """Standard error envelope returned when estimation fails."""
    status: str = "error"
    message: str

"""
Pricing Agent — FastAPI Application
Port: 8001

Responsibilities:
  - Accept POST /estimate from the Backend with a structured AWS task plan
  - Pass the plan to the LLM to generate a cost estimate
  - Return a structured EstimateResponse with monthly cost, breakdown, and warning
  - If LLM fails or returns invalid JSON → return estimate: "unknown" (NEVER crash)
"""

import json
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from llm.client import call_llm
from llm.prompts import PRICING_SYSTEM_PROMPT
from models.schemas import EstimateRequest, EstimateResponse

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [pricing-agent] %(levelname)s — %(message)s",
)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------
app = FastAPI(
    title="Pricing Agent",
    description=(
        "Cost Estimator: provides an estimated monthly AWS cost for a given "
        "structured task plan BEFORE the Worker Agent executes it."
    ),
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _parse_estimate(raw: str) -> EstimateResponse:
    """Parse raw LLM string into an EstimateResponse. Raises on bad JSON."""
    cleaned = raw.strip().lstrip("```json").lstrip("```").rstrip("```").strip()
    data = json.loads(cleaned)
    return EstimateResponse(**data)


def _unknown_estimate(service: str, reason: str) -> EstimateResponse:
    """Return a safe fallback estimate when LLM fails."""
    return EstimateResponse(
        service=service,
        estimated_monthly_cost_usd=None,
        breakdown=f"Could not estimate cost: {reason}",
        warning="Estimate only. Actual cost may vary.",
    )


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------
@app.get("/health")
def health_check():
    """Liveness probe for docker-compose / load balancers."""
    return {"status": "ok", "agent": "pricing-agent"}


@app.post("/estimate", response_model=EstimateResponse)
def estimate(request: EstimateRequest):
    """
    Estimate the monthly AWS cost for a structured task plan.

    Flow:
      1. Build a user message from the incoming plan.
      2. Send it to the LLM with the pricing system prompt.
      3. Parse and validate the JSON cost estimate.
      4. If parsing fails → return a safe "unknown" estimate (do NOT crash).
    """
    logger.info(
        "Estimate request: service=%s action=%s params=%s",
        request.service, request.action, request.parameters,
    )

    user_message = (
        f"Estimate the monthly AWS cost for this task plan:\n"
        f"Service: {request.service}\n"
        f"Action: {request.action}\n"
        f"Parameters: {json.dumps(request.parameters, indent=2)}"
    )

    try:
        raw_response = call_llm(
            system_prompt=PRICING_SYSTEM_PROMPT,
            user_prompt=user_message,
        )
        logger.info("LLM raw response: %s", raw_response)

        estimate_response = _parse_estimate(raw_response)
        logger.info("Estimate validated: %s", estimate_response.model_dump())
        return estimate_response

    except Exception as exc:
        logger.warning("Failed to get/parse LLM estimate: %s", exc)
        return _unknown_estimate(request.service, str(exc))


# ---------------------------------------------------------------------------
# Entry Point
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=False)

"""
Master Agent — FastAPI Application
Port: 8000

Responsibilities:
  - Accept POST /plan from the Backend with a natural-language prompt
  - Pass the prompt to the LLM with a strict system instruction
  - Parse and validate the LLM JSON response using Pydantic
  - Retry once if the first LLM response fails validation
  - Return a structured PlanResponse JSON to the Backend
"""

import json
import logging

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from llm.client import call_llm
from llm.prompts import SYSTEM_PROMPT
from models.schemas import ErrorResponse, PlanRequest, PlanResponse

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [master-agent] %(levelname)s — %(message)s",
)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------
app = FastAPI(
    title="Master Agent",
    description=(
        "AI Planner: converts natural-language AWS instructions into "
        "strict JSON task configurations for the Worker Agent."
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
def _parse_and_validate(raw: str) -> PlanResponse:
    """
    Parse a raw string from the LLM and validate it against PlanResponse.
    Raises ValueError if the JSON is malformed or schema-invalid.
    """
    # Strip any accidental markdown backtick fences the model may still output
    cleaned = raw.strip().lstrip("```json").lstrip("```").rstrip("```").strip()
    data = json.loads(cleaned)  # raises json.JSONDecodeError on bad JSON
    return PlanResponse(**data)  # raises ValidationError on schema mismatch


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------
@app.get("/health")
def health_check():
    """Simple liveness probe for docker-compose / load balancers."""
    return {"status": "ok", "agent": "master-agent"}


@app.post("/plan", response_model=PlanResponse)
def plan(request: PlanRequest):
    """
    Convert a natural-language prompt into a structured AWS task plan.

    Flow:
      1. Send prompt + SYSTEM_PROMPT to LLM
      2. Parse & validate the JSON response
      3. If validation fails → retry the LLM call once
      4. If retry also fails → return HTTP 422
    """
    logger.info("Received plan request: %s", request.prompt)

    for attempt in range(1, 3):  # max 2 attempts (original + 1 retry)
        try:
            raw_response = call_llm(
                system_prompt=SYSTEM_PROMPT,
                user_prompt=request.prompt,
            )
            logger.info("LLM raw response (attempt %d): %s", attempt, raw_response)

            plan_response = _parse_and_validate(raw_response)
            logger.info("Plan validated successfully: %s", plan_response.model_dump())
            return plan_response

        except (json.JSONDecodeError, ValueError, Exception) as exc:
            logger.warning(
                "Attempt %d failed to parse/validate LLM response: %s", attempt, exc
            )
            if attempt == 2:
                raise HTTPException(
                    status_code=422,
                    detail={
                        "status": "error",
                        "message": (
                            f"LLM returned invalid JSON after {attempt} attempts. "
                            f"Last error: {str(exc)}"
                        ),
                    },
                )
            # On first failure, loop and retry automatically


# ---------------------------------------------------------------------------
# Entry Point
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)

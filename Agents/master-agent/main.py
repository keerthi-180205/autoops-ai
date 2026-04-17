"""
Master Agent — FastAPI Application
Port: 8000

Responsibilities:
  - Accept POST /plan from the Backend with a natural-language prompt
  - If the LLM needs more info → return { status: "needs_clarification", questions }
  - If the LLM has enough info → return { status: "ready", service, action, parameters }
  - Accept POST /plan/continue with original prompt + user answers → always return a ready plan
"""

import json
import logging
from typing import Union

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from llm.client import call_llm
from llm.prompts import SYSTEM_PROMPT, CONTINUE_PROMPT
from models.schemas import (
    ClarificationResponse,
    ContinueRequest,
    ErrorResponse,
    PlanRequest,
    PlanResponse,
)

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
        "strict JSON task configurations. Asks clarifying questions when "
        "critical details are missing."
    ),
    version="2.0.0",
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
def _parse_llm_response(raw: str) -> Union[ClarificationResponse, PlanResponse]:
    """
    Parse a raw LLM string into either a ClarificationResponse or PlanResponse.
    Raises ValueError on bad JSON or unknown status.
    """
    cleaned = raw.strip().lstrip("```json").lstrip("```").rstrip("```").strip()
    data = json.loads(cleaned)

    status = data.get("status", "ready")

    if status == "needs_clarification":
        return ClarificationResponse(**data)
    elif status == "ready":
        return PlanResponse(**data)
    elif status == "error":
        raise ValueError(data.get("parameters", {}).get("message", "Unknown error from LLM"))
    else:
        # Backwards compatibility: if no status field, treat as a ready plan
        data["status"] = "ready"
        return PlanResponse(**data)


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------
@app.get("/health")
def health_check():
    """Simple liveness probe for docker-compose / load balancers."""
    return {"status": "ok", "agent": "master-agent"}


@app.post("/plan")
def plan(request: PlanRequest):
    """
    Convert a natural-language prompt into a structured AWS task plan,
    or ask clarifying questions if critical details are missing.

    Returns either:
      - ClarificationResponse { status, questions }
      - PlanResponse { status, service, action, parameters }
    """
    logger.info("Received plan request: %s", request.prompt)

    for attempt in range(1, 3):
        try:
            raw_response = call_llm(
                system_prompt=SYSTEM_PROMPT,
                user_prompt=request.prompt,
            )
            logger.info("LLM raw response (attempt %d): %s", attempt, raw_response)

            result = _parse_llm_response(raw_response)
            logger.info("Parsed response: %s", result.model_dump())
            return result

        except (json.JSONDecodeError, ValueError, Exception) as exc:
            logger.warning(
                "Attempt %d failed to parse LLM response: %s", attempt, exc
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


@app.post("/plan/continue")
def plan_continue(request: ContinueRequest):
    """
    Resume planning after the user has answered clarification questions.
    Always returns a PlanResponse (never asks again).
    """
    logger.info(
        "Continuing plan — original: %s, answers: %s",
        request.original_prompt,
        request.answers,
    )

    combined_prompt = (
        f"Original request: {request.original_prompt}\n"
        f"User's answers to clarification questions: {request.answers}"
    )

    for attempt in range(1, 3):
        try:
            raw_response = call_llm(
                system_prompt=CONTINUE_PROMPT,
                user_prompt=combined_prompt,
            )
            logger.info("LLM continue response (attempt %d): %s", attempt, raw_response)

            result = _parse_llm_response(raw_response)

            # If LLM still asks questions, force a plan with defaults
            if isinstance(result, ClarificationResponse):
                logger.warning("LLM asked questions again on /continue, retrying...")
                if attempt == 2:
                    raise ValueError("LLM failed to produce a plan after clarification")
                continue

            logger.info("Continue plan validated: %s", result.model_dump())
            return result

        except (json.JSONDecodeError, ValueError, Exception) as exc:
            logger.warning(
                "Continue attempt %d failed: %s", attempt, exc
            )
            if attempt == 2:
                raise HTTPException(
                    status_code=422,
                    detail={
                        "status": "error",
                        "message": (
                            f"LLM returned invalid response after clarification. "
                            f"Error: {str(exc)}"
                        ),
                    },
                )


# ---------------------------------------------------------------------------
# Entry Point
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)

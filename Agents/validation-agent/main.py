"""
Validation Agent — FastAPI Application
Port: 8002

Responsibilities:
  - Accept POST /validate from the Backend with a structured AWS task plan
  - Run hardcoded policy and security rule checks first (fast, zero AI)
  - If rules pass, optionally run LLM-based edge-case validation
  - Return approved: true/false with a list of human-readable reasons
  - NEVER crash the server — all checks are wrapped in try/except
"""

import json
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from rules.policy_rules import run_policy_checks
from rules.security_rules import run_security_checks
from models.schemas import ValidateRequest, ValidateResponse

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [validation-agent] %(levelname)s — %(message)s",
)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------
app = FastAPI(
    title="Validation Agent",
    description=(
        "Safety Gatekeeper: validates structured AWS task plans against policy "
        "and security rules BEFORE the Worker Agent executes them on AWS."
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
# Optional: LLM-based edge case check
# ---------------------------------------------------------------------------
def _run_llm_validation(service: str, action: str, parameters: dict) -> list[str]:
    """
    Run LLM-based validation for edge cases not covered by hardcoded rules.
    If the LLM call fails for any reason, silently skip (don't block the request).
    Returns a list of additional rejection reasons, or [] if approved / LLM unavailable.
    """
    try:
        from llm.client import call_llm
        from llm.prompts import VALIDATION_SYSTEM_PROMPT

        user_message = (
            f"Validate this AWS task plan:\n"
            f"Service: {service}\n"
            f"Action: {action}\n"
            f"Parameters: {json.dumps(parameters, indent=2)}"
        )
        raw = call_llm(system_prompt=VALIDATION_SYSTEM_PROMPT, user_prompt=user_message)
        cleaned = raw.strip().lstrip("```json").lstrip("```").rstrip("```").strip()
        result = json.loads(cleaned)

        if not result.get("approved", True):
            return result.get("reasons", ["LLM flagged this plan as unsafe."])
        return []

    except Exception as exc:
        logger.warning("LLM validation skipped due to error: %s", exc)
        return []  # Fail open — don't block if LLM is unavailable


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------
@app.get("/health")
def health_check():
    """Liveness probe for docker-compose / load balancers."""
    return {"status": "ok", "agent": "validation-agent"}


@app.post("/validate", response_model=ValidateResponse)
def validate(request: ValidateRequest):
    """
    Validate a structured AWS task plan against policy and security rules.

    Flow:
      1. Run hardcoded policy checks (region, instance type, IAM policies).
      2. Run hardcoded security checks (bucket names, instance counts, trust policies).
      3. If any violations found → immediately reject (approved: false).
      4. If all hardcoded checks pass → run optional LLM edge-case check.
      5. Return final approved/rejected verdict with reasons.
    """
    logger.info(
        "Validate request: service=%s action=%s params=%s",
        request.service, request.action, request.parameters,
    )

    all_violations: list[str] = []

    try:
        service = request.service.lower().replace("_", "").replace("-", "")
        action = request.action.lower().replace("_", "").replace("-", "")

        # --- Step 1: Policy checks ---
        policy_violations = run_policy_checks(
            service, action, request.parameters
        )
        all_violations.extend(policy_violations)

        # --- Step 2: Security checks ---
        security_violations = run_security_checks(
            service, action, request.parameters
        )
        all_violations.extend(security_violations)

        # --- Step 3: If hardcoded rules already found violations, reject immediately ---
        if all_violations:
            logger.warning("Plan rejected by rule checks: %s", all_violations)
            return ValidateResponse(approved=False, reasons=all_violations)

        # --- Step 4: LLM edge-case check (only runs if all rules pass) ---
        llm_violations = _run_llm_validation(
            request.service, request.action, request.parameters
        )
        all_violations.extend(llm_violations)

        if all_violations:
            logger.warning("Plan rejected by LLM check: %s", all_violations)
            return ValidateResponse(approved=False, reasons=all_violations)

        # --- Step 5: All checks passed ---
        logger.info("Plan approved.")
        return ValidateResponse(approved=True, reasons=[])

    except Exception as exc:
        # Safety net — should never be reached, but we never crash the server
        logger.error("Unexpected error during validation: %s", exc)
        return ValidateResponse(
            approved=False,
            reasons=[f"Validation engine encountered an unexpected error: {str(exc)}"],
        )


# ---------------------------------------------------------------------------
# Entry Point
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8002, reload=False)

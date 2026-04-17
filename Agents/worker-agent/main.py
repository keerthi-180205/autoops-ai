"""
Worker Agent — FastAPI Application
Port: 9000

Responsibilities:
  - Accept POST /execute from the Backend (or directly from Master Agent output)
  - Route the structured JSON plan to the correct AWS handler (S3 / EC2 / IAM)
  - Return a structured result JSON
  - NEVER crash the server — ALL boto3 calls are wrapped in try/except
  - ZERO AI in this agent. Pure deterministic if/else routing.
"""

import logging

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Any, Dict

from handlers import s3_handler, ec2_handler, iam_handler

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [worker-agent] %(levelname)s — %(message)s",
)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------
app = FastAPI(
    title="Worker Agent",
    description=(
        "AWS Executor: receives structured JSON task plans and deterministically "
        "executes them against AWS using boto3. Zero AI."
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
# Request Schema
# ---------------------------------------------------------------------------
class ExecuteRequest(BaseModel):
    """Mirrors the PlanResponse output from the Master Agent."""
    service: str
    action: str
    parameters: Dict[str, Any] = {}


# ---------------------------------------------------------------------------
# Action Router Tables
# ---------------------------------------------------------------------------
S3_ACTIONS = {
    "create_bucket": s3_handler.create_bucket,
    "delete_bucket": s3_handler.delete_bucket,
    "list_buckets": s3_handler.list_buckets,
    "upload_object": s3_handler.upload_object,
    "delete_object": s3_handler.delete_object,
}

EC2_ACTIONS = {
    "run_instances": ec2_handler.run_instances,
    "stop_instances": ec2_handler.stop_instances,
    "start_instances": ec2_handler.start_instances,
    "terminate_instances": ec2_handler.terminate_instances,
    "describe_instances": ec2_handler.describe_instances,
}

IAM_ACTIONS = {
    "create_user": iam_handler.create_user,
    "delete_user": iam_handler.delete_user,
    "list_users": iam_handler.list_users,
    "attach_user_policy": iam_handler.attach_user_policy,
    "create_role": iam_handler.create_role,
}

SERVICE_ROUTER = {
    "s3": S3_ACTIONS,
    "ec2": EC2_ACTIONS,
    "iam": IAM_ACTIONS,
}


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------
@app.get("/health")
def health_check():
    """Simple liveness probe for docker-compose / load balancers."""
    return {"status": "ok", "agent": "worker-agent"}


@app.post("/execute")
def execute_plan(request: ExecuteRequest):
    """
    Execute a structured AWS task plan.

    Routing logic:
      service → handler module → specific action function
      All AWS calls are wrapped in try/except inside each handler.
      This endpoint will NEVER raise an unhandled exception.
    """
    logger.info(
        "Execute request: service=%s action=%s params=%s",
        request.service,
        request.action,
        request.parameters,
    )

    try:
        # --- Route to the correct service ---
        service_actions = SERVICE_ROUTER.get(request.service)
        if service_actions is None:
            logger.warning("Unsupported service: %s", request.service)
            return {
                "status": "failed",
                "error": f"Unsupported service: '{request.service}'. Supported: s3, ec2, iam.",
            }

        # --- Route to the correct action within the service ---
        handler_fn = service_actions.get(request.action)
        if handler_fn is None:
            logger.warning(
                "Unsupported action '%s' for service '%s'", request.action, request.service
            )
            return {
                "status": "failed",
                "error": (
                    f"Unsupported action: '{request.action}' "
                    f"for service '{request.service}'."
                ),
            }

        # --- Execute the handler ---
        result = handler_fn(request.parameters)
        logger.info("Execution result: %s", result)
        return result

    except Exception as e:
        # Absolute safety net — should never be reached because each handler
        # already catches its own exceptions, but we guard here too.
        logger.error("Unexpected error during execution: %s", str(e))
        return {"status": "failed", "error": f"Unexpected worker error: {str(e)}"}


# ---------------------------------------------------------------------------
# Entry Point
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=9000, reload=False)

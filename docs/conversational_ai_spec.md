# Feature Spec: Conversational AI Flow + Detailed Resource Response

> **Status:** Approved  
> **Author:** DevOps (Ganesh)  
> **Audience:** AI Team + Backend + Frontend teammates  

---

## Problem
Currently the system is a one-shot pipeline: user types a prompt → plan → execute. If the user says "create EC2 instance" without specifying OS, key pair, or instance family, the master agent guesses defaults silently. There's no way for the AI to ask clarifying questions, no pricing shown before execution, and after creation only a bare resource ID is returned.

---

## Changes Required

### 1. Master Agent — Multi-Turn Conversation

**File:** `Agents/master-agent/llm/prompts.py`  
Rewrite `SYSTEM_PROMPT` to support two response modes:

**Mode A — Clarification Needed** (when details are missing):
```json
{
  "status": "needs_clarification",
  "questions": [
    "Which OS would you like? (Amazon Linux 2, Ubuntu 22.04, Windows Server 2022)",
    "Which instance type? (t2.micro, t2.small, t2.medium)",
    "Do you want to create a new key pair or use an existing one?"
  ]
}
```

**Mode B — Plan Ready** (when enough info is provided):
```json
{
  "service": "ec2",
  "action": "run_instances",
  "parameters": { ... }
}
```

The LLM should ask about missing details for EC2 (OS/AMI, key pair, instance type, security group) and for S3 (versioning, access policy). For simple requests like "list buckets", skip questions.

**File:** `Agents/master-agent/models/schemas.py`  
Add a new `ClarificationResponse` pydantic model alongside `PlanResponse`.

**File:** `Agents/master-agent/main.py`  
- Add a new `/plan` response branch: if LLM returns `status: "needs_clarification"`, return it as-is (not an error).
- Add a `POST /plan/continue` endpoint that accepts `{ "prompt": "original prompt", "answers": "user's follow-up answers" }` to feed conversation context back to the LLM.

---

### 2. Backend — Multi-Turn Orchestration

**File:** `backend/src/services/agentService.ts`  
In `orchestratePipeline`:
- After calling master-agent, check if response has `status: "needs_clarification"`.
- If so, update DB record with `status: "awaiting_input"` and store the `questions` array in `result_logs`.
- Do NOT proceed to validation/execution. Wait for user to reply.

After pricing agent responds, append a clear pricing line to logs:
```
💰 Estimated Monthly Cost: $8.50 (t2.micro in ap-south-1: ~$0.0116/hr × 730hrs)
```

After worker agent returns success, log detailed resource info:
```
✅ EC2 Instance Created:
   Instance ID: i-0bb10d484c242f9fb
   Instance Type: t2.micro
   Region: ap-south-1
   Public IP: 13.234.xxx.xxx
   State: running
```

**File:** `backend/src/controllers/requestHandler.ts`  
Add new endpoint `POST /api/request/:id/reply` that accepts the user's answers, calls `master-agent /plan/continue`, and resumes the pipeline.

---

### 3. Worker Agent — Return Detailed Resource Info

**File:** `Agents/worker-agent/handlers/ec2_handler.py`  
In `run_instances()`:
- After creating the instance, call `describe_instances` to fetch full details.
- Wait/poll for public IP to be assigned.
- Return richer response:
```json
{
  "status": "success",
  "resource_id": "i-0bb10d484c242f9fb",
  "details": {
    "InstanceId": "i-0bb10d484c242f9fb",
    "InstanceType": "t2.micro",
    "Region": "ap-south-1",
    "PublicIp": "13.234.56.78",
    "PrivateIp": "172.31.0.10",
    "State": "running",
    "LaunchTime": "2026-04-17T21:30:00Z"
  }
}
```

**File:** `Agents/worker-agent/handlers/s3_handler.py`  
Similarly return bucket ARN, region, and creation date.

---

### 4. Frontend — Conversation UI

**File:** `frontend/src/components/RequestHistory.tsx`  
- When `status === "awaiting_input"`, render the AI's questions as a styled list.
- Show a text input below the questions for the user to type answers.
- On submit, call `POST /api/request/:id/reply` and resume polling.

**File:** `frontend/src/services/api.ts`  
Add a `replyToRequest(id, answer)` function.

---

## Testing

1. Open `http://localhost:3000`.
2. Type "create ec2 instance" (intentionally vague).
3. **Expected:** AI responds with clarifying questions (OS, instance type, key pair).
4. Answer the questions in the reply box.
5. **Expected:** Pipeline continues → pricing shown → execution → detailed resource info displayed.
6. Type "create s3 bucket named test-bucket in us-east-1" (fully specified).
7. **Expected:** No questions asked, direct execution with pricing + details.

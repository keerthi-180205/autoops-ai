# Worker Agent (AWS Executor) PRD & Technical Spec

## 1. Overview
The Worker Agent is the purely deterministic execution muscle. It receives structured, validated JSON configs and directly runs them against AWS using the Boto3 SDK.

## 2. Tech Stack & Environment
- **Framework:** Python + FastAPI.
- **AWS SDK:** `boto3`.
- **Internal Network Port:** `9000`.

## 3. Mandatory File Structure
```text
worker-agent/
├── main.py                  # FastAPI server and route definitions
├── handlers/
│   ├── s3_handler.py        # Logic for mapping JSON to boto3.client('s3')
│   ├── ec2_handler.py       # Logic for mapping JSON to boto3.client('ec2')
│   ├── iam_handler.py       # Logic for mapping JSON to boto3.client('iam')
├── requirements.txt         # pip install fastapi uvicorn boto3
```

## 4. System Rules & Logic Requirements
**Rule 1:** ZERO AI IN THIS FOLDER. No LLMs, no prompting, no guessing. Code must be `if/else` and `try/except`.
**Rule 2:** The `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` are provided in the environment via docker-compose. Boto3 will pick them up automatically.

## 5. API Communication Contracts

### Expose: `POST /execute`
**Input (from Backend/Master generated):**
```json
{
  "service": "s3",
  "action": "create_bucket",
  "parameters": {
    "Bucket": "secure-bucket",
    "Region": "us-east-1"
  }
}
```

**Your Logic Flow:**
```python
@app.post("/execute")
def execute_plan(plan: dict):
    try:
        if plan["service"] == "s3":
            if plan["action"] == "create_bucket":
                # call s3_handler.create_bucket(plan["parameters"])
                return {"status": "success", "resource_id": "secure-bucket"}
        # ... fallback errors ...
    except Exception as e:
        return {"status": "failed", "error": str(e)}
```

### 🛑 Critical Safety Feature
You must wrap EVERY Boto3 call in a `try/except Exception as e:` block. If AWS throws an error (e.g., "Bucket already exists"), you must catch it and gracefully return `{ "status": "failed", "error": "AWS Error: Bucket Name taken" }`. DO NOT CRASH THE FASTAPI SERVER.

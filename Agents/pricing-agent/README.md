# Pricing Agent PRD & Technical Spec

## 1. Overview
The Pricing Agent estimates the cost of provisioning a requested AWS resource **before** it is actually created. It uses an LLM (Gemini/OpenAI) to look up current AWS pricing based on the structured execution plan and returns a cost estimate to the backend. This gives the user a chance to confirm or cancel before money is spent.

## 2. Tech Stack & Environment
- **Framework:** Python + FastAPI.
- **LLM SDK:** `google-genai` (Gemini), `openai`, or LangChain.
- **Internal Network Port:** `8001`.

## 3. Mandatory File Structure
```text
Agents/pricing-agent/
├── main.py                  # FastAPI server and route definitions
├── llm/
│   ├── client.py            # Initializes the LLM API using keys from .env
│   ├── prompts.py           # System prompt to generate cost estimates
├── models/
│   ├── schemas.py           # Pydantic models for input/output validation
├── requirements.txt         # pip install fastapi uvicorn openai/google-genai
```

## 4. System Rules
**Rule 1:** Use API keys from `.env` (e.g., `OPENAI_API_KEY`). Do NOT build or train any model.
**Rule 2:** You do NOT execute any AWS commands. You only estimate costs.
**Rule 3:** If you cannot estimate a cost, return `"estimate": "unknown"` instead of crashing.

## 5. API Communication Contracts

### Expose: `POST /estimate`
**Input (from Backend):**
```json
{
  "service": "ec2",
  "action": "launch_instance",
  "parameters": {
    "InstanceType": "t2.micro",
    "Region": "ap-south-1"
  }
}
```

**Your Logic:**
1. Pass the structured plan to Gemini/GPT with a system prompt asking for AWS pricing estimation.
2. Return a JSON object with the estimated monthly cost.

**Output (to Backend):**
```json
{
  "service": "ec2",
  "estimated_monthly_cost_usd": 8.50,
  "breakdown": "t2.micro in ap-south-1: ~$0.0116/hr × 730hrs",
  "warning": "Estimate only. Actual cost may vary."
}
```

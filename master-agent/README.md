# Master Agent (AI Planner) PRD & Technical Spec

## 1. Overview
The Master Agent is the "Brain". Its only job is to map messy human English strings into perfectly strict JSON configurations. 

## 2. Tech Stack & Environment
- **Framework:** Python + FastAPI.
- **LLM SDK:** `google-genai` (Gemini), `openai` SDK, or LangChain.
- **Internal Network Port:** `8000`.

## 3. Mandatory File Structure
```text
master-agent/
├── main.py                  # FastAPI server and route definitions
├── llm/
│   ├── client.py            # Initializes the LLM API using keys from .env
│   ├── prompts.py           # Contains the brutal SYSTEM_PROMPT string
├── models/
│   ├── schemas.py           # Pydantic validation models for input/output
├── requirements.txt         # pip install fastapi uvicorn openai/google-genai
```

## 4. System Rules & Agent Logic
**Rule 1:** NEVER build or fine-tune an AI model for this hackathon. Use the API keys provided in `.env` (e.g., `OPENAI_API_KEY`).
**Rule 2:** You do NOT execute any AWS commands. You only return text (JSON).

### The SYSTEM_PROMPT Requirements
You must construct a System Prompt that forces the LLM to output ONLY RAW JSON—no markdown backticks, no "Here is your plan" pleasantries. 
The LLM must understand three target services: S3, EC2, and IAM.

## 5. API Communication Contracts

### Expose: `POST /plan`
**Input (from Backend):**
```json
{
  "prompt": "Create an s3 bucket named secure-bucket in region us-east-1"
}
```

**Your Logic:**
1. Pass the prompt to Gemini/GPT-4 with your System Prompt.
2. Ensure the LLM outputs a JSON format like below.
3. Validate the JSON structure using Pydantic (or standard json.loads). If it fails, retry the LLM call once.

**Output (to Backend):**
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

# Autonomous IT Operations Orchestrator (AUTOops)

## Overview
AUTOops is an AI-driven system designed to provision cloud infrastructure using plain English natural language, entirely eliminating manual AWS console clicks and Terraform debugging. 

## Project Architecture
This repository consists of four microservices and an infrastructure/DevOps layer:
- **`frontend/`**: The UI dashboard for users to type their prompt request and view the current execution status.
- **`backend/`**: The Node.js central API gateway/Traffic Controller that passes data between services and manages state.
- **`Agents/master-agent/`**: Python LLM planner that uses OpenAI/Gemini to translate english into strict JSON execution plans.
- **`Agents/worker-agent/`**: Pure deterministic Python executor that calls `boto3` to provision the exact AWS resources dictated by the master plan.
- **`infra/`**: Docker & DevOps configuration, including the `docker-compose.yml` to spin the entire system up.

## Quick Start (Local Setup)
1. Ensure Docker Desktop is installed and running.
2. Copy the `.env.example` template:
```bash
cd infra
cp .env.example .env
```
3. Populate the `.env` file with your AWS and OpenAI API keys.
4. Build and start the entire stack:
```bash
docker compose up -d --build
```
5. Open your browser to `http://localhost:3000` to interact with the system.

*(Note: If you are building out a specific microservice, please navigate into your directory and read the detailed PRD `README.md` assigned to your role.)*

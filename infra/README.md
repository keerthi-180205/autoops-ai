# Infra & DevOps Hub

## 1. Overview
This folder is the orchestration center for the environment. It controls how the microservices discover each other locally and how they authenticate with external cloud providers (AWS, OpenAI).

## 2. The Core Files
- **`docker-compose.yml`**: Uses Docker's internal networking. Because of this file:
  - The `backend` can reach the master agent via HTTP request to `http://master-agent:8000` (it resolves via the docker DNS).
  - The `backend` connects to PostgreSQL simply by aiming at `postgres:5432`.
- **`.env.example`**: The master key template. Every developer must copy this to `.env` and insert the actual AWS/LLM keys. Docker-compose will automatically inject the `.env` values into the containers at runtime.
- **`deploy_windows.ps1` & `deploy_ubuntu.sh`**: Setup scripts to rapidly install Docker on a new local machine or AWS EC2 instance.

## 3. Network Port Mappings
If you are developing locally, here is what is exposed to your machine:
- **`localhost:3000`** -> Maps inside the Frontend container.
- **`localhost:5000`** -> Maps inside the Backend container.
- **`localhost:5432`** -> Maps to the PostgreSQL DB.
*(Note: Master and Worker internal ports 8000 and 9000 are not exposed externally in docker-compose. They are only reachable from the Backend container to ensure traffic security.)*

## 4. How to Restart/Rebuild Services
If a teammate updates their `package.json` or `requirements.txt`, standard `docker compose up` will not catch it. Run:
```bash
docker compose up -d --build
```
To view logs if a service is crashing:
```bash
docker compose logs -f backend
docker compose logs -f master-agent
```

# Backend Microservice PRD & Technical Spec

## 1. Overview
The backend is the **Central Controller** and **State Manager**. You hold the entire system together. You receive requests from the UI, store them in the database, sequentially call the AI planners and AWS executors, and log the results.

## 2. Tech Stack & Environment
- **Framework:** Node.js + Express.js (or Fastify).
- **Database ORM:** Prisma or Drizzle (connected to the local PostgreSQL container).
- **Internal Network Port:** `5000`.
- **Dependencies to install:** `express`, `cors`, `axios`, `pg` (or `prisma`).

## 3. Mandatory File Structure
```text
backend/
├── src/
│   ├── server.ts             # Express setup, middleware, and app.listen()
│   ├── routes/
│   │   ├── index.ts          # Mount POST /api/request and GET /api/status/:id
│   ├── controllers/
│   │   ├── requestHandler.ts # Handles the 5-step relay race logic
│   ├── services/
│   │   ├── agentService.ts   # Axios calls to master-agent & worker-agent
│   ├── db/
│   │   ├── schema.prisma     # Postgres tables
├── package.json
```

## 4. Database Schema Requirement
You must create a `Request` table (or model) with the following fields:
- `id` (UUID or Int Auto-increment)
- `prompt` (String)
- `status` (Enum: `pending`, `planning`, `executing`, `success`, `failed`)
- `result_logs` (JSONB or Text Array)
- `created_at` (Timestamp)

## 5. The Core Execution Pipeline (CRITICAL)
When `POST /api/request` is hit, your controller must execute this exact flow asynchronously (do not block the HTTP return—return the `id` immediately and run the rest in the background):

1. **DB Insert:** Create DB record with status = `planning`.
2. **Call Master Agent:** 
   - `POST http://master-agent:8000/plan` body: `{ "prompt": "..." }`
   - Master agent returns a structured JSON execution plan.
3. **DB Update:** Change status = `executing`. Append to `result_logs`: `"Plan generated successfully"`.
4. **Call Worker Agent:**
   - `POST http://worker-agent:9000/execute` body: *(the exact JSON you got from master)*
   - Worker agent returns AWS success/failure.
5. **DB Final Update:** Change status = `success` or `failed`. Append the final AWS resource ID or AWS Error to `result_logs`.

## 6. Error Handling
If the `master-agent` times out or hallucinates garbage JSON, catch the Axios error, update the DB status to `failed`, and write the error into the logs. The frontend relies on your database state.

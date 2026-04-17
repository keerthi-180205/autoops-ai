# Frontend Microservice PRD & Technical Spec

## 1. Overview
The frontend is a "dumb" UI layer. It holds zero AWS credentials, calls no LLMs, and performs no orchestration. Its sole purpose is to capture user text input, forward it to the `backend`, and visually render the status of the infrastructure creation.

## 2. Tech Stack & Environment
- **Framework:** Next.js (App Router) or React (Vite).
- **Internal Network Port:** `3000` (`http://localhost:3000`).
- **Dependencies to install:** `axios` (for fetching), `tailwindcss` (for styling).

## 3. Mandatory File Structure
You must structure your logic inside the `frontend/` directory like this:
```text
frontend/
├── src/
│   ├── app/
│   │   ├── page.tsx          # Main dashboard & layout compilation
│   ├── components/
│   │   ├── PromptInput.tsx   # Text input box and Execute button
│   │   ├── RequestHistory.tsx# Table showing past request statuses
│   ├── services/
│   │   ├── api.ts            # The ONLY file allowed to make axios calls
├── package.json
```

## 4. API Communication Contracts
**Rule:** You will ONLY communicate with the `backend` container running on `http://backend:5000` (or `localhost:5000` from the browser). Do NOT talk to the agents.

### A. Submitting a New Infrastructure Request
- **Endpoint:** `POST /api/request`
- **Request Body:** `{ "prompt": "create a public s3 bucket called test-bucket" }`
- **Expected Return:** `{ "id": 123, "status": "planning" }`

### B. Polling for Execution Status
- **Endpoint:** `GET /api/status/{id}`
- **Expected Return:**
  ```json
  {
    "id": 123,
    "status": "success", 
    "message": "Bucket test-bucket created successfully",
    "logs": ["Parsed intent...", "Generated JSON plan...", "AWS S3 Bucket Created"]
  }
  ```
  *(Note: `status` will cycle from `planning` -> `executing` -> `success` / `failed`)*

## 5. UI Logic & State Requirements
1. **Button Debouncing:** When a user clicks "Execute", immediately disable the submit button and show a loading spinner to prevent duplicate spam clicking.
2. **Polling Loop:** Use `setInterval` (or React Query) to hit the `/api/status/{id}` endpoint every 2 seconds.
3. **Termination:** Clear the setInterval polling loop ONLY when the status string equals exactly `"success"` or `"failed"`.
4. **Error Boundaries:** If the backend crashes and returns HTTP 500, display a red toast notification. Do not let the React app white-screen.

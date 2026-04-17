# Product Requirements Document (PRD)

**Product Name:** Autonomous IT Operations Orchestrator

---

## 1. Overview

### Problem Statement
Provisioning cloud infrastructure still requires manual console work, writing Terraform templates, understanding complex AWS configs, remembering IAM permissions, and dealing with human mistakes. Even experienced engineers waste time doing repetitive infrastructure tasks. Less experienced developers often click random checkboxes, potentially leading to security risks or unexpected cloud bills.

We need a system that:
- Understands natural language requests.
- Converts them into structured infrastructure actions.
- Executes safely.
- Logs everything for an audit trail.

### Vision
Allow developers to provision infrastructure using plain English, while maintaining safety, observability, and control.

**Example:**
> *"Create a private S3 bucket in ap-south-1 with versioning enabled"*

The system automatically:
1. Interprets the request.
2. Generates an execution plan.
3. Provisions the resources.
4. Logs actions.
5. Displays the status in a dashboard.

---

## 2. Goals

### Primary Goals
- Reduce the time required to provision infrastructure.
- Reduce configuration mistakes.
- Provide an audit trail for infrastructure changes.
- Enable AI-driven DevOps workflows.

### Secondary Goals
- Allow integration with external AI tools (e.g., via MCP).
- Provide monitoring visibility.
- Create a reusable orchestration framework.

---

## 3. Target Users

| Role | Use Case | Priority |
| :--- | :--- | :--- |
| **DevOps Engineers** | Automate repetitive infrastructure provisioning. | Primary |
| **Developers** | Create resources without deep AWS knowledge. | Primary |
| **Startup/Hackathon Teams**| Rapid environment setup. | Primary |
| **AI Agents** | Auto-provision infrastructure programmatically. | Secondary |
| **Platform Teams** | Enforce infrastructure standards & policies. | Secondary |

---

## 4. User Stories

| ID | As a... | I want to... | So that... |
| :--- | :--- | :--- | :--- |
| **US-1** | Developer | Create infrastructure using plain English | I don’t need to manually configure cloud resources. |
| **US-2** | Developer | See execution status clearly | I know if resources were created successfully. |
| **US-3** | Platform Admin | View logs of infrastructure changes | I can track system activity and maintain security compliance. |
| **US-4** | Organization | Set policies restricting infrastructure creation | Users cannot create expensive or insecure resources. |
| **US-5** | AI Developer | Have my AI agent call orchestrator APIs | Infrastructure provisioning can be automated via MCP. |

---

## 5. Features

### 5.1 Natural Language Interface
Users submit infrastructure requests in plain English.
- **Input Sources:** Web UI, API Endpoint, MCP Server.
- **Examples:**
  - *"Create S3 bucket"*
  - *"Create EC2 instance t2.micro"*
  - *"Create IAM role for Lambda"*

### 5.2 LLM Planning Engine
Generates structured execution plans from natural language.
- **Functions:** Parse request → Detect resource type → Extract parameters → Generate execution plan.
- **Example Output:**
  ```json
  {
    "resource": "ec2",
    "region": "ap-south-1",
    "instance_type": "t2.micro"
  }
  ```

### 5.3 Worker Agents (Service-Specific Execution)
- **S3 Agent:** Create bucket, enable versioning, configure access policy.
- **EC2 Agent:** Launch instance, configure instance type, attach security group.
- **IAM Agent:** Create role, attach policy.

### 5.4 Execution Engine
Executes the generated plan step-by-step using the AWS SDK, handles failures, and returns execution status.

### 5.5 Observability & Dashboard
- **Logging Service:** Tracks request content, execution steps, success/failure status, timestamps, and created resources.
- **Monitoring Dashboard:** Displays request history, execution progress, success rates, and resources created.

### 5.6 MCP Integration
Allows external AI agents to call the orchestrator (e.g., an AI coding assistant automatically creates the necessary infrastructure for the code it just wrote).

---

## 6. Functional & Non-Functional Requirements

### Functional Requirements
| ID | Requirement |
| :--- | :--- |
| **FR1** | System must accept natural language infrastructure requests. |
| **FR2** | System must identify the requested cloud resource type. |
| **FR3** | System must generate a structured execution plan. |
| **FR4** | System must execute the plan using the AWS SDK. |
| **FR5** | System must store granular execution logs. |
| **FR6** | System must display request status to the user. |
| **FR7** | System must support external API and MCP server calls. |
| **FR8** | System must gracefully handle and report execution failures. |
| **FR9** | System must block/restrict unsupported resource types. |

### Non-Functional Requirements
- **Performance:** Response time < 3 seconds for LLM plan generation.
- **Reliability:** Retry logic for failed steps; idempotency to prevent duplicate resources.
- **Security:** Secure storage of AWS credentials; RBAC; pre-execution policy validation.
- **Scalability:** System must support multiple concurrent requests using a scalable, modular agent architecture.
- **Observability:** Structured logging and distributed request tracing.

---

## 7. Architecture & Tech Stack

### System Architecture
- **Interface Layer:** Next.js Dashboard, API Gateway.
- **AI Orchestration Layer:** LLM Planner, Execution Planner.
- **Agent Execution Layer:** S3 Agent, EC2 Agent, IAM Agent.
- **Integration Layer:** MCP Server.
- **Observability Layer:** Logging service, PostgreSQL, Dashboard.
- **Cloud Layer:** AWS SDK, AWS Services.

### Tech Stack
| Component | Technology |
| :--- | :--- |
| **Frontend** | Next.js |
| **Backend** | Node.js |
| **AI** | OpenAI API |
| **Cloud SDK** | AWS SDK |
| **Database** | PostgreSQL |
| **Logging** | Pino |
| **Containerization** | Docker |
| **Deployment** | AWS / Render |
| **Integration** | Model Context Protocol (MCP) |

---

## 8. MVP Scope

### ✅ Included in MVP
- Create S3 bucket, EC2 instance, and IAM role.
- Logging dashboard.
- Basic execution validation.

### ❌ Excluded from MVP (Post-Hackathon)
- Kubernetes provisioning.
- Multi-cloud support (GCP, Azure).
- Advanced networking configurations.
- Complex Terraform template generation.

---

## 9. Risks & Mitigations

| Risk | Mitigation |
| :--- | :--- |
| Incorrect LLM parsing | Strict JSON schema validation. |
| High AWS costs run amok | Strict policy restrictions & limits (e.g., only t2.micro). |
| Security vulnerabilities | Minimal IAM role scoping. |
| Execution failure / API limits | Exponential backoff & retry logic. |
| Ambiguous user prompts | Add a **"human-in-the-loop" confirmation step** before execution. |

---

## 10. Future Enhancements
- Terraform script export (Infrastructure as Code).
- Kubernetes & Multi-cloud support.
- Cost estimation *before* execution.
- Policy engine integration (e.g., OPA).
- Workflow templates.
- Rollback support.
- Slack & CI/CD pipeline integration.

---

## 11. Success Metrics
- Successful infrastructure creation rate (%).
- Average execution time per request.
- Number of supported cloud services.
- User adoption rate.
- Error/Failure rate.

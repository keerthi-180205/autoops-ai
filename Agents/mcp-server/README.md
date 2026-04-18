# AUTOops MCP Server

Exposes AWS infrastructure tools via the [Model Context Protocol](https://modelcontextprotocol.io/) so that any MCP-compatible LLM (Claude, Cursor, Windsurf, etc.) can create, manage, and destroy AWS resources.

## Available Tools

| Tool | Description |
|---|---|
| `create_ec2_instance` | Launch an EC2 instance with configurable AMI, type, region, key pair |
| `list_ec2_instances` | List all EC2 instances in a region |
| `stop_ec2_instance` | Stop a running instance |
| `start_ec2_instance` | Start a stopped instance |
| `terminate_ec2_instance` | Permanently destroy an instance |
| `create_s3_bucket` | Create a new S3 bucket |
| `list_s3_buckets` | List all S3 buckets |
| `delete_s3_bucket` | Delete an empty bucket |
| `create_iam_user` | Create an IAM user |
| `list_iam_users` | List all IAM users |
| `delete_iam_user` | Delete an IAM user |

## Setup

### 1. Install dependencies
```bash
cd Agents/mcp-server
pip install -r requirements.txt
```

### 2. Set AWS credentials
```bash
export AWS_ACCESS_KEY_ID="<your-key>"
export AWS_SECRET_ACCESS_KEY="<your-secret>"
export AWS_REGION="ap-south-1"
```

### 3. Test the server
```bash
python server.py
```

### 4. Add to your LLM client

**Claude Desktop** — add to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "autoops": {
      "command": "python",
      "args": ["/absolute/path/to/AUTOops/Agents/mcp-server/server.py"],
      "env": {
        "AWS_ACCESS_KEY_ID": "<your-key>",
        "AWS_SECRET_ACCESS_KEY": "<your-secret>",
        "AWS_REGION": "ap-south-1"
      }
    }
  }
}
```

**Cursor / Windsurf** — add to `.cursor/mcp.json` or equivalent:

```json
{
  "mcpServers": {
    "autoops": {
      "command": "python",
      "args": ["/absolute/path/to/AUTOops/Agents/mcp-server/server.py"]
    }
  }
}
```

## Architecture

The MCP server reuses the **same boto3 handlers** as the AUTOops worker-agent. No AI, no LLMs — pure deterministic AWS API calls routed through the MCP tool interface.

```
LLM Client (Claude/Cursor)
    │
    │  MCP protocol (stdio)
    ▼
AUTOops MCP Server (server.py)
    │
    ├── ec2_handler.py  →  boto3 EC2 API
    ├── s3_handler.py   →  boto3 S3 API
    └── iam_handler.py  →  boto3 IAM API
```

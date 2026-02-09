# Infrastructure Agents

This folder contains the Python agents responsible for collecting and pushing metrics to the central dashboard.

## Setup

1.  **Install Dependencies**:
    ```bash
    pip install -r requirements.txt
    ```

2.  **Get an Agent Token**:
    -   Log in to the Central Dashboard.
    -   Go to **Settings**.
    -   Generate a new token (e.g., for "VM Agent").
    -   Copy the token.

## Running the Agents

You can run these agents as system services or cron jobs.

### VM Agent
Captures CPU, RAM, Disk usage, and Hostname info.

```bash
export API_URL="https://your-app-url.repl.co/api/ingest/vm"
export AGENT_TOKEN="your_token_here"
python vm_agent.py
```

### Database Agent
Captures DB stats (mocked for demo, can connect to Postgres).

```bash
export API_URL="https://your-app-url.repl.co/api/ingest/db"
export AGENT_TOKEN="your_token_here"
python db_agent.py
```

### Kubernetes Agent
Captures Cluster stats.

```bash
export API_URL="https://your-app-url.repl.co/api/ingest/k8s"
export AGENT_TOKEN="your_token_here"
python k8s_agent.py
```

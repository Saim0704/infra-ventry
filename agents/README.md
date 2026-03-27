# Infra-Ventry Agents

This folder contains monitoring agents responsible for collecting and pushing metrics to the Infra-Ventry central dashboard.

## Directory Structure

```
agents/
├── src/            # Source code for high-performance agents (TS, Go)
├── scripts/        # Bash and Python helper scripts for one-time/cron tasks
├── dist/           # Compiled binaries for distribution
└── README.md       # This file
```

## High-Performance Agents

### Real-time Binary Agent (TypeScript/Node)
Located at `src/agent.ts`.

**Build Command:**
```bash
npx esbuild agents/src/agent.ts --bundle --platform=node --format=cjs --outfile=agents/dist/infra-ventry-agent --banner:js='#!/usr/bin/env node' && chmod +x agents/dist/infra-ventry-agent
```

**Run Command:**
```bash
export SERVER_URL="http://your-server:3000"
export AGENT_TOKEN="your_token"
./agents/dist/infra-ventry-agent
```

### Go Agent (Maximum Efficiency)
Located at `src/agent.go`.

**Build Command:**
```bash
go build -o agents/dist/infra-ventry-go-agent agents/src/agent.go
```

**Run Command:**
```bash
export SERVER_URL="http://your-server:3000"
export AGENT_TOKEN="your_token"
./agents/dist/infra-ventry-go-agent
```

## Helper Scripts

### Bash Monitoring Script
Located at `scripts/vm_agent.sh`. Used for Periodic (Cron) monitoring.

### Service Version Auditor
Located at `scripts/audit_services.sh`. Used to detect versions of Nginx, PostgreSQL, etc.

## Deployment

Production-ready scripts and binaries are synced to the `public/scripts/` directory on the server to be served to target machines via `curl`.

- `public/scripts/infra-ventry-agent`: The compiled binary.
- `public/scripts/install-agent.sh`: The systemd persistent installer.
- `public/scripts/audit_services.sh`: The version auditor.

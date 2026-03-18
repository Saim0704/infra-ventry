#!/bin/bash

# Infrawatch Agent Persistent Installer
# Usage: curl -sL ... | sudo bash -s -- <SERVER_URL> <AGENT_TOKEN>

SERVER_URL=$1
AGENT_TOKEN=$2

if [ -z "$SERVER_URL" ] || [ -z "$AGENT_TOKEN" ]; then
    echo "Error: SERVER_URL and AGENT_TOKEN are required."
    echo "Usage: install-agent.sh <SERVER_URL> <AGENT_TOKEN>"
    exit 1
fi

# 0. Avoid stale directory issues by moving to a safe location
cd /tmp

echo "Installing Infrawatch Agent Persistent Service..."

# 1. Create Installation Directory
INSTALL_DIR="/opt/infrawatch-agent"
mkdir -p $INSTALL_DIR

# 2. Download Agent Components
echo "Downloading agent components from $SERVER_URL..."
# Try to get binary first, fallback to shell
if curl -s -f -L "$SERVER_URL/get/infrawatch-agent" -o $INSTALL_DIR/infrawatch-agent; then
    chmod +x $INSTALL_DIR/infrawatch-agent
    AGENT_EXEC="$INSTALL_DIR/infrawatch-agent"
    echo "Using compiled binary agent."
else
    curl -s -L "$SERVER_URL/get/vm_agent.sh" -o $INSTALL_DIR/vm_agent.sh
    chmod +x $INSTALL_DIR/vm_agent.sh
    AGENT_EXEC="/bin/bash $INSTALL_DIR/vm_agent.sh"
    echo "Binary not found, falling back to shell agent."
fi

# 3. Create Environment File
cat <<EOF > $INSTALL_DIR/agent.env
SERVER_URL=$SERVER_URL
AGENT_TOKEN=$AGENT_TOKEN
EOF

# 4. Perform First Run (Initial Audit)
echo "Performing initial system audit..."
/bin/bash -c "curl -s -L '$SERVER_URL/get/audit_services.sh' | bash -s -- '$SERVER_URL' '$AGENT_TOKEN'"

# 5. Create systemd Service File
cat <<EOF > /etc/systemd/system/infrawatch-agent.service
[Unit]
Description=Infrawatch Infrastructure Monitoring Agent
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=$INSTALL_DIR
EnvironmentFile=$INSTALL_DIR/agent.env
ExecStart=$AGENT_EXEC "$SERVER_URL" "$AGENT_TOKEN"
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# 6. Monthly Audit is now handled automatically by the agent (agentic)
# No manual crontab entry needed for audit anymore.

# 7. Reload systemd and Start Service
echo "Enabling and starting service..."
systemctl daemon-reload
systemctl enable infrawatch-agent
systemctl restart infrawatch-agent

echo "------------------------------------------------"
echo "Infrawatch Agent installed successfully!"
echo "Status: $(systemctl is-active infrawatch-agent)"
echo "Check logs: journalctl -u infrawatch-agent -f"
echo "------------------------------------------------"

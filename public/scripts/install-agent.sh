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

echo "Installing Infrawatch Agent Persistent Service..."

# 1. Create Installation Directory
INSTALL_DIR="/opt/infrawatch-agent"
mkdir -p $INSTALL_DIR

# 2. Download Binary
echo "Downloading agent binary from $SERVER_URL..."
curl -s -L "$SERVER_URL/get/infrawatch-agent" -o $INSTALL_DIR/infrawatch-agent
chmod +x $INSTALL_DIR/infrawatch-agent

# 3. Create Environment File
cat <<EOF > $INSTALL_DIR/agent.env
SERVER_URL=$SERVER_URL
AGENT_TOKEN=$AGENT_TOKEN
INTERVAL=60000
EOF

# 4. Create systemd Service File
cat <<EOF > /etc/systemd/system/infrawatch-agent.service
[Unit]
Description=Infrawatch Infrastructure Monitoring Agent
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=$INSTALL_DIR
EnvironmentFile=$INSTALL_DIR/agent.env
# Run audit once before starting the persistent agent
ExecStartPre=/usr/bin/curl -s -L "$SERVER_URL/get/audit_services.sh" | /usr/bin/bash -s -- "$SERVER_URL" "$AGENT_TOKEN"
ExecStart=$INSTALL_DIR/infrawatch-agent
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# 5. Reload systemd and Start Service
echo "Enabling and starting service..."
systemctl daemon-reload
systemctl enable infrawatch-agent
systemctl restart infrawatch-agent

echo "------------------------------------------------"
echo "Infrawatch Agent installed successfully!"
echo "Status: $(systemctl is-active infrawatch-agent)"
echo "Check logs: journalctl -u infrawatch-agent -f"
echo "------------------------------------------------"

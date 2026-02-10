#!/bin/bash

# Configuration
SERVER_URL="${SERVER_URL:-http://localhost:5000}"
AGENT_TOKEN="${AGENT_TOKEN:-infra_inventory_agent_secret_2026}"

# Basic System Specs
HOSTNAME=$(hostname)
OS_NAME=$(uname -s)
OS_VERSION=$(uname -r)
CPU_CORES=$(nproc)

# RAM in GB (Total)
TOTAL_RAM=$(free -m | awk '/^Mem:/{printf "%.2f", $2/1024}')

# Disk in GB (Total for root)
TOTAL_DISK=$(df -BM / | awk 'NR==2{print $2}' | sed 's/M//' | awk '{printf "%.2f", $1/1024}')

# IP Address
IP_ADDRESS=$(hostname -I | awk '{print $1}')
if [ -z "$IP_ADDRESS" ]; then
    IP_ADDRESS="127.0.0.1"
fi

# Current Utilization (Metrics)
CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | sed "s/.*, *\([0-9.]*\)%* id.*/\1/" | awk '{print 100 - $1}')
MEMORY_USAGE=$(free | grep Mem | awk '{print $3/$2 * 100.0}')
DISK_USAGE=$(df / | awk 'NR==2{print $5}' | sed 's/%//')

# Top 5 Processes by CPU
# Get top 5 processes and format as JSON array using awk
TOP_PROCESSES=$(ps aux --sort=-%cpu | awk 'BEGIN{printf "["} NR>1 && NR<=6 {
    if (NR>2) printf ",";
    gsub(/"/, "\\\"", $11);
    printf "{\"pid\":%s,\"name\":\"%s\",\"cpu\":%.1f,\"memory\":%.1f}", $2, $11, $3, $4
} END{printf "]"}')

# Fallback to empty array if something went wrong
if [ -z "$TOP_PROCESSES" ] || [ "$TOP_PROCESSES" = "[" ] || [ "$TOP_PROCESSES" = "[]" ]; then
    TOP_PROCESSES="[]"
fi

# Construct JSON Payload
DATA_JSON=$(cat <<EOF
{
  "hostname": "$HOSTNAME",
  "os": "$OS_NAME",
  "osVersion": "$OS_VERSION",
  "cpuCores": $CPU_CORES,
  "totalRam": $TOTAL_RAM,
  "totalDisk": $TOTAL_DISK,
  "ipAddress": "$IP_ADDRESS",
  "metrics": {
    "cpuUsage": $CPU_USAGE,
    "memoryUsage": $MEMORY_USAGE,
    "diskUsage": $DISK_USAGE,
    "topProcesses": $TOP_PROCESSES
  }
}
EOF
)

# Report to Server
echo "Reporting metrics to $SERVER_URL/api/ingest/vm..."
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$SERVER_URL/api/ingest/vm" \
  -H "Content-Type: application/json" \
  -d "{ \"token\": \"$AGENT_TOKEN\", \"data\": $DATA_JSON }")

HTTP_STATUS=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n -1)

if [ "$HTTP_STATUS" -eq 200 ]; then
    echo "Metrics reported successfully for $HOSTNAME"
else
    echo "Failed to report metrics: $HTTP_STATUS"
    echo "Response: $BODY"
    exit 1
fi

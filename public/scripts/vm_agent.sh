#!/bin/bash

# Configuration
SERVER_URL="$1"
AGENT_TOKEN="$2"
INTERVAL="${INTERVAL:-0}" # Default is provided via env

# Function to run report once
report() {
    # Basic System Specs
    local HOSTNAME=$(hostname)
    local OS_NAME=$(uname -s)
    local OS_VERSION=$(uname -r)
    local CPU_CORES=$(nproc)

    # RAM in GB (Total)
    local TOTAL_RAM=$(free -m | awk '/^Mem:/{printf "%.2f", $2/1024}')

    # Disk in GB (Total for root)
    local TOTAL_DISK=$(df -BM / | awk 'NR==2{print $2}' | sed 's/M//' | awk '{printf "%.2f", $1/1024}')

    # IP Address
    local IP_ADDRESS=$(hostname -I | awk '{print $1}')
    if [ -z "$IP_ADDRESS" ]; then
        IP_ADDRESS="127.0.0.1"
    fi

    # Current Utilization (Metrics)
    local CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | sed "s/.*, *\([0-9.]*\)%* id.*/\1/" | awk '{print 100 - $1}')
    local MEMORY_USAGE=$(free | grep Mem | awk '{print $3/$2 * 100.0}')
    local DISK_USAGE=$(df / | awk 'NR==2{print $5}' | sed 's/%//')

    # Top 5 Processes by CPU
    local TOP_PROCESSES=$(ps aux --sort=-%cpu | awk 'BEGIN{printf "["} NR>1 && NR<=6 {
        if (NR>2) printf ",";
        gsub(/"/, "\\\"", $11);
        printf "{\"pid\":%s,\"name\":\"%s\",\"cpu\":%.1f,\"memory\":%.1f}", $2, $11, $3, $4
    } END{printf "]"}')

    # Fallback to empty array if something went wrong
    if [ -z "$TOP_PROCESSES" ] || [ "$TOP_PROCESSES" = "[" ] || [ "$TOP_PROCESSES" = "[]" ]; then
        TOP_PROCESSES="[]"
    fi

    # Construct JSON Payload
    local DATA_JSON=$(cat <<EOF
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
    local RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$SERVER_URL/api/ingest/vm" \
      -H "Content-Type: application/json" \
      -d "{ \"token\": \"$AGENT_TOKEN\", \"data\": $DATA_JSON }")

    local HTTP_STATUS=$(echo "$RESPONSE" | tail -n1)
    local BODY=$(echo "$RESPONSE" | head -n -1)

    if [ "$HTTP_STATUS" -eq 200 ]; then
        echo "Metrics reported successfully for $HOSTNAME"
        
        # Determine dynamic interval (server returns minutes)
        local SRV_INTERVAL=$(echo "$BODY" | grep -o '"interval":[0-9]*' | cut -d: -f2)
        if [ ! -z "$SRV_INTERVAL" ] && [ "$SRV_INTERVAL" -gt 0 ]; then
            SLEEP_TIME=$((SRV_INTERVAL * 60))
        fi

        # Check for audit request
        local SHOULD_AUDIT=$(echo "$BODY" | grep -o '"shouldAudit":true' | wc -l)
        if [ "$SHOULD_AUDIT" -eq 1 ]; then
            echo "Server requested service audit. Running audit tool..."
            # Try to run from install dir first, fallback to curl
            if [ -f "/opt/infrawatch-agent/audit_services.sh" ]; then
                /bin/bash /opt/infrawatch-agent/audit_services.sh "$SERVER_URL" "$AGENT_TOKEN"
            else
                /bin/bash -c "curl -s -L '$SERVER_URL/get/audit_services.sh' | bash -s -- '$SERVER_URL' '$AGENT_TOKEN'"
            fi
        fi

        return 0
    else
        echo "Failed to report metrics: $HTTP_STATUS"
        echo "Response: $BODY"
        # If failed, keep waiting but maybe slow down
        return 1
    fi
}

# Default sleep time if not provided (5 mins)
if [ ! -z "$INTERVAL" ] && [ "$INTERVAL" -gt 0 ]; then
    SLEEP_TIME=$((INTERVAL / 1000))
else
    SLEEP_TIME=${SLEEP_TIME:-300}
fi

echo "Initial report..."
report

echo "Monitoring started. Current interval: ${SLEEP_TIME}s"
while true; do
    sleep "$SLEEP_TIME"
    report
done

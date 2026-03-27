#!/bin/bash

# Ensure we have a decent PATH for cron jobs
export PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:$PATH"

# Configuration
SERVER_URL="$1"
AGENT_TOKEN="$2"
LOG_FILE="/tmp/infra-ventry_audit.log"

# Function to log both to console and file
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

if [ -z "$SERVER_URL" ]; then
    echo "Usage: $0 <SERVER_URL> [AGENT_TOKEN]"
    exit 1
fi

log "------------------------------------------------"
log "Infra-Ventry Service Audit Tool v1.1"

# Better IP detection
IP_ADDRESS=$(hostname -I | awk '{print $1}')
[ -z "$IP_ADDRESS" ] && IP_ADDRESS=$(curl -s ifconfig.me) # Fallback to external if local fails
HOSTNAME=$(hostname)

log "Checking registration for $IP_ADDRESS ($HOSTNAME)..."

CHECK_URL="$SERVER_URL/api/servers/verify?ip=$IP_ADDRESS&hostname=$HOSTNAME"
CHECK_RESPONSE=$(curl -s "$CHECK_URL")

log "Verify Response: $CHECK_RESPONSE"

# Check if response is valid JSON and contains registered:true
IS_REGISTERED=$(echo "$CHECK_RESPONSE" | grep -o '"registered":true' | wc -l)

# Use found token if not provided as argument
if [ -z "$AGENT_TOKEN" ]; then
    AGENT_TOKEN=$(echo "$CHECK_RESPONSE" | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')
fi

if [ -z "$AGENT_TOKEN" ]; then
    log "WARNING: Server not registered and no token provided."
    log "Audit cannot be submitted without an AGENT_TOKEN if the server is new."
    log "Please provide it as: $0 <URL> <TOKEN>"
    exit 1
fi

log "Success: Initialized. Starting deep service audit..."

# Function to safely get version and clean it up
get_ver() {
    local cmd=$1
    local args=$2
    if command -v "$cmd" >/dev/null 2>&1; then
        res=$("$cmd" $args 2>&1 | head -n 1)
        # Extract version number using basic patterns
        ver=$(echo "$res" | grep -oE '[0-9]+\.[0-9]+(\.[0-9]+)?' | head -n 1)
        [ -z "$ver" ] && echo "Detected" || echo "$ver"
    else
        echo "N/A"
    fi
}

# Detection logic
NGINX=$(nginx -v 2>&1 | grep -oE '[0-9]+\.[0-9]+\.[0-9]+')
[ -z "$NGINX" ] && NGINX="N/A"

APACHE=$(httpd -v 2>&1 | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' || apache2 -v 2>&1 | grep -oE '[0-9]+\.[0-9]+\.[0-9]+')
[ -z "$APACHE" ] && APACHE="N/A"

PG=$(get_ver psql "--version")
MYSQL=$(get_ver mysql "--version")
NODE=$(get_ver node "--version")
PYTHON=$(get_ver python3 "--version" || get_ver python "--version")
JAVA=$(java -version 2>&1 | head -n 1 | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' || java -version 2>&1 | head -n 1 | grep -oE '"[0-9]+"' | tr -d '"')
[ -z "$JAVA" ] && JAVA="N/A"

PHP=$(get_ver php "-v")
DOCKER=$(get_ver docker "--version")

# Build JSON object
SERVICES="{"
add_item() {
    local key=$1
    local val=$2
    if [ "$SERVICES" != "{" ]; then SERVICES+=","; fi
    # Escape for JSON
    val=$(echo "$val" | sed 's/"/\\"/g' | tr -d '\n\r')
    SERVICES+="\"$key\":\"$val\""
}

# Web Server Logic (Pick one or both)
WS_FINAL="N/A"
if [ "$NGINX" != "N/A" ]; then WS_FINAL="Nginx v$NGINX"; 
elif [ "$APACHE" != "N/A" ]; then WS_FINAL="Apache v$APACHE"; fi

add_item "Web Server" "$WS_FINAL"
add_item "PostgreSQL" "$PG"
add_item "MySQL" "$MYSQL"
add_item "Node.js" "$NODE"
add_item "Python" "$PYTHON"
add_item "Java" "$JAVA"
add_item "PHP" "$PHP"
add_item "Docker" "$DOCKER"

SERVICES+="}"

log "Audit Data: $SERVICES"

# Report to specialized audit endpoint
log "Reporting audit results to Infra-Ventry..."
CURL_OUT=$(curl -s -w "\n%{http_code}" -X POST "$SERVER_URL/api/ingest/audit" \
  -H "Content-Type: application/json" \
  -d "{\"token\":\"$AGENT_TOKEN\",\"data\":{\"hostname\":\"$HOSTNAME\",\"ipAddress\":\"$IP_ADDRESS\",\"serviceVersions\":$SERVICES}}")

HTTP_STATUS=$(echo "$CURL_OUT" | tail -n1)

if [ "$HTTP_STATUS" -eq 200 ]; then
    log "------------------------------------------------"
    log "SUCCESS: Audit report submitted successfully."
    log "Check the 'Service Versions' tab in the dashboard."
    log "------------------------------------------------"
else
    log "ERROR: Failed to submit audit (HTTP $HTTP_STATUS)"
    log "Response: $(echo "$CURL_OUT" | head -n -1)"
    exit 1
fi

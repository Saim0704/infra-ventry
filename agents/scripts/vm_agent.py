import psutil
import socket
import platform
import requests
import time
import os
import sys

# Configuration
SERVER_URL = os.getenv("SERVER_URL", "http://localhost:5000")
AGENT_TOKEN = os.getenv("AGENT_TOKEN", "infra_inventory_agent_secret_2026")
REPORT_INTERVAL = int(os.getenv("REPORT_INTERVAL", "60"))

def get_system_metrics():
    # Basic Specs
    hostname = socket.gethostname()
    os_name = platform.system()
    os_version = platform.release()
    cpu_cores = psutil.cpu_count(logical=True)
    total_ram = round(psutil.virtual_memory().total / (1024**3), 2)  # GB
    total_disk = round(psutil.disk_usage('/').total / (1024**3), 2)  # GB
    
    # Try to get IP address
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip_address = s.getsockname()[0]
        s.close()
    except Exception:
        ip_address = "127.0.0.1"

    # Current Usage
    cpu_usage = psutil.cpu_percent(interval=1)
    memory_usage = psutil.virtual_memory().percent
    disk_usage = psutil.disk_usage('/').percent

    return {
        "hostname": hostname,
        "os": os_name,
        "osVersion": os_version,
        "cpuCores": cpu_cores,
        "totalRam": total_ram,
        "totalDisk": total_disk,
        "ipAddress": ip_address,
        "metrics": {
            "cpuUsage": cpu_usage,
            "memoryUsage": memory_usage,
            "diskUsage": disk_usage
        }
    }

def report_metrics():
    print(f"Starting Infra-Inventory Agent (reporting to {SERVER_URL})...")
    endpoint = f"{SERVER_URL}/api/ingest/vm"
    
    while True:
        try:
            data = get_system_metrics()
            payload = {
                "token": AGENT_TOKEN,
                "data": data
            }
            
            response = requests.post(endpoint, json=payload, timeout=10)
            if response.status_code == 200:
                print(f"[{time.strftime('%H:%M:%S')}] Metrics reported successfully for {data['hostname']}")
            else:
                print(f"[{time.strftime('%H:%M:%S')}] Failed to report metrics: {response.status_code} - {response.text}")
                
        except Exception as e:
            print(f"[{time.strftime('%H:%M:%S')}] Error: {str(e)}")
            
        time.sleep(REPORT_INTERVAL)

if __name__ == "__main__":
    try:
        report_metrics()
    except KeyboardInterrupt:
        print("\nAgent stopped.")
        sys.exit(0)

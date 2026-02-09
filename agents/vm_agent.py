import time
import json
import psutil
import requests
import socket
import platform
import os

# CONFIGURATION
API_URL = os.getenv("API_URL", "https://your-app-url.repl.co/api/ingest/vm")
AGENT_TOKEN = os.getenv("AGENT_TOKEN", "YOUR_AGENT_TOKEN_HERE")
INTERVAL = int(os.getenv("INTERVAL", "60")) # Seconds

def get_static_info():
    return {
        "hostname": socket.gethostname(),
        "os": f"{platform.system()} {platform.release()}",
        "cpuCores": psutil.cpu_count(logical=True),
        "totalRam": round(psutil.virtual_memory().total / (1024**3), 2), # GB
        "totalDisk": round(psutil.disk_usage('/').total / (1024**3), 2), # GB
        "ipAddress": socket.gethostbyname(socket.gethostname())
    }

def get_metrics():
    return {
        "cpuUsage": psutil.cpu_percent(interval=1),
        "memoryUsage": psutil.virtual_memory().percent,
        "diskUsage": psutil.disk_usage('/').percent
    }

def main():
    print(f"Starting VM Agent...")
    print(f"Target API: {API_URL}")
    
    # Get static info once (or periodically if dynamic)
    static_info = get_static_info()
    
    while True:
        try:
            metrics = get_metrics()
            
            payload = {
                "token": AGENT_TOKEN,
                "data": {
                    **static_info,
                    "metrics": metrics
                }
            }
            
            response = requests.post(API_URL, json=payload, timeout=10)
            
            if response.status_code == 200:
                print(f"[{time.strftime('%H:%M:%S')}] Metrics pushed successfully.")
            else:
                print(f"[{time.strftime('%H:%M:%S')}] Failed to push metrics: {response.status_code} - {response.text}")
                
        except Exception as e:
            print(f"Error: {e}")
            
        time.sleep(INTERVAL)

if __name__ == "__main__":
    main()

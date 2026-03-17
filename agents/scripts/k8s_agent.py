import time
import json
import requests
import os
# from kubernetes import client, config

# CONFIGURATION
API_URL = os.getenv("API_URL", "https://your-app-url.repl.co/api/ingest/k8s")
AGENT_TOKEN = os.getenv("AGENT_TOKEN", "YOUR_AGENT_TOKEN_HERE")
INTERVAL = int(os.getenv("INTERVAL", "60"))

def get_cluster_info():
    # In real agent: config.load_incluster_config() or load_kube_config()
    # v1 = client.CoreV1Api()
    # nodes = v1.list_node()
    return {
        "name": os.getenv("CLUSTER_NAME", "prod-cluster-1"),
        "version": "1.27.3",
        "nodeCount": 3,
        "totalCpu": 12,    # Cores
        "totalMemory": 32  # GB
    }

def get_metrics():
    # In real agent, use Metrics API
    import random
    return {
        "cpuUsage": round(random.uniform(20, 80), 1),
        "memoryUsage": round(random.uniform(30, 90), 1),
        "podCount": random.randint(20, 50)
    }

def main():
    print(f"Starting K8s Agent...")
    print(f"Target API: {API_URL}")
    
    cluster_info = get_cluster_info()
    
    while True:
        try:
            metrics = get_metrics()
            
            payload = {
                "token": AGENT_TOKEN,
                "data": {
                    **cluster_info,
                    "metrics": metrics
                }
            }
            
            response = requests.post(API_URL, json=payload, timeout=10)
            
            if response.status_code == 200:
                print(f"[{time.strftime('%H:%M:%S')}] K8s metrics pushed successfully.")
            else:
                print(f"[{time.strftime('%H:%M:%S')}] Failed: {response.status_code} - {response.text}")
                
        except Exception as e:
            print(f"Error: {e}")
            
        time.sleep(INTERVAL)

if __name__ == "__main__":
    main()

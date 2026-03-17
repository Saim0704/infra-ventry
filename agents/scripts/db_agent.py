import time
import json
import requests
import os
# import psycopg2 # Uncomment if using real DB connection

# CONFIGURATION
API_URL = os.getenv("API_URL", "https://your-app-url.repl.co/api/ingest/db")
AGENT_TOKEN = os.getenv("AGENT_TOKEN", "YOUR_AGENT_TOKEN_HERE")
INTERVAL = int(os.getenv("INTERVAL", "60"))

# DB CONFIG
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = int(os.getenv("DB_PORT", "5432"))
DB_NAME = os.getenv("DB_NAME", "postgres")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASS = os.getenv("DB_PASS", "password")

def get_db_info():
    # In a real agent, query 'SELECT version();'
    return {
        "name": f"Postgres-{DB_HOST}",
        "engine": "PostgreSQL",
        "version": "15.4", 
        "host": DB_HOST,
        "port": DB_PORT
    }

def get_metrics():
    # In a real agent, run queries like:
    # SELECT pg_database_size(current_database());
    # SELECT count(*) FROM pg_stat_activity;
    
    # Mocking for demonstration
    import random
    return {
        "storageUsed": round(random.uniform(10, 500), 2), # GB
        "activeConnections": random.randint(5, 100)
    }

def main():
    print(f"Starting Database Agent...")
    print(f"Target API: {API_URL}")
    
    db_info = get_db_info()
    
    while True:
        try:
            metrics = get_metrics()
            
            payload = {
                "token": AGENT_TOKEN,
                "data": {
                    **db_info,
                    "metrics": metrics
                }
            }
            
            response = requests.post(API_URL, json=payload, timeout=10)
            
            if response.status_code == 200:
                print(f"[{time.strftime('%H:%M:%S')}] DB metrics pushed successfully.")
            else:
                print(f"[{time.strftime('%H:%M:%S')}] Failed: {response.status_code} - {response.text}")
                
        except Exception as e:
            print(f"Error: {e}")
            
        time.sleep(INTERVAL)

if __name__ == "__main__":
    main()

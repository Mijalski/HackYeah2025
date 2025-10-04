import os
import logging
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from databricks import sql

# --- Logging Setup ---
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s"
)
logger = logging.getLogger(__name__)

app = FastAPI(title="Simple FastAPI + React App + Databricks")

# --- Databricks Connection Setup ---
DATABRICKS_SERVER_HOSTNAME = os.getenv("DATABRICKS_SERVER_HOSTNAME")  # e.g. "adb-xxxx.xx.azuredatabricks.net"
DATABRICKS_HTTP_PATH = os.getenv("DATABRICKS_HTTP_PATH")              # e.g. "/sql/1.0/warehouses/xxxx"
DATABRICKS_TOKEN = os.getenv("DATABRICKS_TOKEN")                      # your personal access token

def query_databricks(query: str):
    try:
        with sql.connect(
            server_hostname=DATABRICKS_SERVER_HOSTNAME,
            http_path=DATABRICKS_HTTP_PATH,
            access_token=DATABRICKS_TOKEN
        ) as connection:
            with connection.cursor() as cursor:
                cursor.execute(query)
                result = cursor.fetchall()
                columns = [desc[0] for desc in cursor.description]
                return [dict(zip(columns, row)) for row in result]
    except Exception as e:
        logger.error(f"Databricks query failed: {e}")
        raise HTTPException(status_code=500, detail="Error querying Databricks")

# --- API Routes ---
@app.get("/api/hello")
async def hello():
    logger.info("Accessed /api/hello")
    return {"message": "Hello from FastAPI!"}

@app.get("/api/health")
async def health_check():
    logger.info("Health check at /api/health")
    return {"status": "healthy"}

@app.get("/api/raw-data")
async def get_data():
    logger.info("Querying Databricks for raw detections")
    query = """
        SELECT latitude, longitude, timestamp_Utc, confidence, sensor_type, classification
        FROM de_ml_ws.default.silver_drone_detections
        LIMIT 100
    """
    rows = query_databricks(query)
    return {"data": rows}

# --- Static Files Setup ---
static_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static")
os.makedirs(static_dir, exist_ok=True)
app.mount("/", StaticFiles(directory=static_dir, html=True), name="static")

# --- Catch-all for React Routes ---
@app.get("/{full_path:path}")
async def serve_react(full_path: str):
    index_html = os.path.join(static_dir, "index.html")
    if os.path.exists(index_html):
        logger.info(f"Serving React frontend for path: /{full_path}")
        return FileResponse(index_html)
    logger.error("Frontend not built. index.html missing.")
    raise HTTPException(
        status_code=404,
        detail="Frontend not built. Please run 'npm run build' first."
    )

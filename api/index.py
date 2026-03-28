import os
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import tempfile
from .inference import process_alerts_file

app = FastAPI(title="ClearAlert ML Engine - Vercel")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

@app.get("/api")
@app.get("/api/")
async def root():
    return {"status": "online", "message": "ClearAlert ML Engine (Vercel Serverless) is running."}

@app.post("/api/analyze")
async def analyze_file(file: UploadFile = File(...)):
    extension = file.filename.split(".")[-1].lower()
    if extension not in ["csv", "xlsx", "xls"]:
        raise HTTPException(status_code=400, detail="Invalid file format.")

    with tempfile.NamedTemporaryFile(delete=False, suffix=f".{extension}") as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name

    try:
        results = process_alerts_file(tmp_path)
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)

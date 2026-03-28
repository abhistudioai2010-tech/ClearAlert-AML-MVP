import io
import os
import uvicorn
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from inference import process_alerts_file
import tempfile

app = FastAPI(title="ClearAlert ML Engine")

# Configure CORS for Web Access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"status": "online", "message": "ClearAlert ML Engine is running."}

@app.post("/api/analyze")
async def analyze_file(file: UploadFile = File(...)):
    """
    Accepts a CSV/Excel file, runs the anomaly detection pipeline,
    and returns the structured results.
    """
    extension = file.filename.split(".")[-1].lower()
    if extension not in ["csv", "xlsx", "xls"]:
        raise HTTPException(status_code=400, detail="Invalid file format. Please upload CSV or Excel.")

    # Create a temporary file to save the upload
    with tempfile.NamedTemporaryFile(delete=False, suffix=f".{extension}") as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name

    try:
        # Pass the temporary path to our existing inference engine
        results = process_alerts_file(tmp_path)
        return results
    except Exception as e:
        import traceback
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        # Clean up temporary file
        if os.path.exists(tmp_path):
            os.remove(tmp_path)

if __name__ == "__main__":
    import sys
    # Add the current directory to sys.path so uvicorn can find 'main'
    sys.path.append(os.path.dirname(os.path.abspath(__file__)))
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

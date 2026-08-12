"""Vercel entrypoint for the Aarisha Admin API."""
import os
from fastapi import FastAPI
from fastapi.responses import FileResponse

from backend.app.main import app as admin_app

app = FastAPI()
app.mount("/api", admin_app)

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def get_file_path(filename: str) -> str:
    return os.path.join(ROOT_DIR, filename)

@app.get("/")
@app.get("/index.html")
@app.get("/index")
async def read_index():
    return FileResponse(get_file_path("index.html"))

@app.get("/styles.css")
async def read_styles():
    return FileResponse(get_file_path("styles.css"))

@app.get("/Logo.png")
async def read_logo():
    return FileResponse(get_file_path("Logo.png"))

@app.get("/favicon.ico")
async def read_favicon():
    return FileResponse(get_file_path("Logo.png"))

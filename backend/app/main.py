from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from .database import engine
from .models import Base
from .api import router

app = FastAPI(
    title="Leeky 2.0 OSINT Platform",
    description="AI-Driven OSINT Investigation Platform",
    version="2.0.0"
)

# Create tables on startup
@app.on_event("startup")
async def startup_event():
    try:
        Base.metadata.create_all(bind=engine)
        print("Database tables created successfully")
    except Exception as e:
        print(f"Error creating database tables: {e}")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
app.include_router(router, prefix="/api")

@app.get("/")
def root():
    return {
        "message": "Leeky 2.0 OSINT Platform API",
        "version": "2.0.0",
        "docs": "/docs"
    }

@app.get("/health")
def health():
    return {"status": "healthy", "service": "leeky-backend"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
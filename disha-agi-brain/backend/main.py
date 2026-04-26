import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="DISHA AGI Brain",
    description="Next-Generation Repository Intelligence Engine",
    version="1.0.0",
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For development; restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def health_check():
    return {
        "status": "online",
        "service": "disha-agi-brain",
        "mission": "god_mode_engaged"
    }

@app.post("/api/v1/query")
def query_repository(query: str):
    # TODO: Connect to RAG pipeline and Agent Orchestrator
    return {"query": query, "response": "RAG pipeline currently initializing. Awaiting embeddings."}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

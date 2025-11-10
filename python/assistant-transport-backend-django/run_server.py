"""
Alternative entry point using uvicorn (matching FastAPI pattern exactly).
Usage: python run_server.py
"""
import os
import uvicorn
from dotenv import load_dotenv

# Load environment variables
load_dotenv()


def main():
    """Main entry point for running the server with uvicorn."""
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8002"))
    debug = os.getenv("DEBUG", "false").lower() == "true"
    log_level = os.getenv("LOG_LEVEL", "info").lower()

    print(f"🌟 Starting Assistant Transport Backend (Django) on {host}:{port}")
    print(f"🎯 Debug mode: {debug}")
    print(f"🌍 CORS origins: {os.getenv('CORS_ORIGINS', 'http://localhost:3000')}")

    uvicorn.run(
        "assistant_backend.asgi:application",
        host=host,
        port=port,
        reload=debug,
        log_level=log_level,
        access_log=True,
    )


if __name__ == "__main__":
    main()

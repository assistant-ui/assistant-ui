#!/usr/bin/env python
"""Django's command-line utility for administrative tasks."""
import os
import sys
from pathlib import Path


def main():
    """Run administrative tasks or start the server."""
    # Add parent directory to Python path
    parent_dir = Path(__file__).resolve().parent
    sys.path.insert(0, str(parent_dir))

    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "assistant_backend.settings")

    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed and "
            "available on your PYTHONPATH environment variable? Did you "
            "forget to activate a virtual environment?"
        ) from exc

    # If no arguments provided, default to runserver
    if len(sys.argv) == 1:
        from dotenv import load_dotenv
        load_dotenv()

        host = os.getenv("HOST", "0.0.0.0")
        port = os.getenv("PORT", "8002")

        print(f"🌟 Starting Assistant Transport Backend (Django) on {host}:{port}")
        print(f"🎯 Debug mode: {os.getenv('DEBUG', 'True')}")
        print(f"🌍 CORS origins: {os.getenv('CORS_ORIGINS', 'http://localhost:3000')}")

        sys.argv = ["manage.py", "runserver", f"{host}:{port}"]

    execute_from_command_line(sys.argv)


if __name__ == "__main__":
    main()

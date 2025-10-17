#!/usr/bin/env python3
"""
Setup script for Assistant Transport Backend.

This script helps users get started by:
1. Checking Python version
2. Creating a virtual environment (optional)
3. Installing dependencies
4. Setting up environment variables
"""

import os
import sys
import subprocess
from pathlib import Path


def check_python_version():
    """Check if Python version is compatible."""
    version = sys.version_info
    if version.major < 3 or (version.major == 3 and version.minor < 9):
        print("❌ Python 3.9+ is required")
        sys.exit(1)
    print(f"✅ Python {version.major}.{version.minor}.{version.micro} detected")


def run_command(command, description):
    """Run a shell command and handle errors."""
    print(f"🔄 {description}...")
    try:
        result = subprocess.run(command, shell=True, check=True, capture_output=True, text=True)
        print(f"✅ {description} completed")
        return result.stdout
    except subprocess.CalledProcessError as e:
        print(f"❌ {description} failed: {e}")
        print(f"Error output: {e.stderr}")
        return None


def main():
    """Main setup function."""
    print("🚀 Assistant Transport Backend Setup Script")
    print("=" * 40)
    
    # Check Python version
    check_python_version()
    
    # Check if we're in the right directory
    if not Path("pyproject.toml").exists():
        print("❌ Please run this script from the assistant-transport-backend directory")
        sys.exit(1)
    
    # Ask user about virtual environment
    create_venv = input("\n💡 Create a virtual environment? (y/N): ").lower().strip()
    if create_venv in ['y', 'yes']:
        venv_name = input("Virtual environment name (default: venv): ").strip() or "venv"
        
        if not Path(venv_name).exists():
            run_command(f"python -m venv {venv_name}", f"Creating virtual environment '{venv_name}'")
        
        # Provide activation instructions
        if os.name == 'nt':  # Windows
            activate_cmd = f"{venv_name}\\Scripts\\activate"
        else:  # Unix/Linux/macOS
            activate_cmd = f"source {venv_name}/bin/activate"
        
        print(f"\n💡 To activate the virtual environment, run:")
        print(f"   {activate_cmd}")
        print("💡 Then re-run this setup script.")
        return
    
    # Install dependencies
    print("\n📦 Installing dependencies...")
    if Path("pyproject.toml").exists():
        # Try pip install with pyproject.toml (editable install)
        result = run_command("pip install -e .", "Installing package in editable mode")
        if not result:
            # Fallback to requirements.txt
            run_command("pip install -r requirements.txt", "Installing from requirements.txt")
    else:
        run_command("pip install -r requirements.txt", "Installing from requirements.txt")
    
    # Set up environment variables
    print("\n🔧 Setting up environment variables...")
    env_file = Path(".env")
    example_env = Path(".env.example")
    
    if not env_file.exists() and example_env.exists():
        # Copy example env file
        with open(example_env, 'r') as f:
            example_content = f.read()
        
        with open(env_file, 'w') as f:
            f.write(example_content)
        
        print("✅ Created .env file from .env.example")
        print("💡 Please edit .env file to add your API keys:")
        print("   - OPENAI_API_KEY (for OpenAI GPT models)")
        print("   - ANTHROPIC_API_KEY (for Anthropic Claude models)")
    elif env_file.exists():
        print("✅ .env file already exists")
    
    # Final instructions
    print("\n🎉 Setup complete!")
    print("\n🚀 To start the server:")
    print("   python main.py")
    print("\n   Or:")
    print("   uvicorn main:app --reload --host 0.0.0.0 --port 8000")
    print("\n📖 The server will be available at http://localhost:8000")
    print("🌐 API endpoint will be at http://localhost:8000/assistant")
    
    # Test server start
    test_server = input("\n🧪 Test server startup? (y/N): ").lower().strip()
    if test_server in ['y', 'yes']:
        print("\n🧪 Testing server startup (will stop after 5 seconds)...")
        try:
            import signal
            import time
            from multiprocessing import Process
            
            # Import and start server
            from main import app
            import uvicorn
            
            def run_test_server():
                uvicorn.run(app, host="127.0.0.1", port=8000, log_level="warning")
            
            process = Process(target=run_test_server)
            process.start()
            time.sleep(2)
            
            # Test if server responds
            try:
                import httpx
                response = httpx.get("http://127.0.0.1:8000/health", timeout=3.0)
                if response.status_code == 200:
                    print("✅ Server test successful!")
                else:
                    print(f"⚠️ Server responded with status {response.status_code}")
            except Exception as e:
                print(f"⚠️ Could not test server: {e}")
            
            process.terminate()
            process.join()
            
        except Exception as e:
            print(f"⚠️ Server test failed: {e}")


if __name__ == "__main__":
    main()
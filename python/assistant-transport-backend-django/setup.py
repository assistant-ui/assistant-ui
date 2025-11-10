#!/usr/bin/env python3
"""
Setup script for Assistant Transport Backend (Django)

This script helps set up the development environment by:
1. Checking Python version
2. Creating a virtual environment (optional)
3. Installing dependencies
4. Setting up .env file
5. Running initial checks
"""

import sys
import subprocess
import os
from pathlib import Path


def check_python_version():
    """Ensure Python 3.9+ is installed."""
    version = sys.version_info
    if version.major < 3 or (version.major == 3 and version.minor < 9):
        print("❌ Python 3.9 or higher is required")
        print(f"   Current version: Python {version.major}.{version.minor}.{version.micro}")
        sys.exit(1)
    print(f"✅ Python {version.major}.{version.minor}.{version.micro} detected")


def run_command(command: str, description: str) -> bool:
    """Run a shell command and print the result."""
    print(f"\n🔄 {description}...")
    try:
        subprocess.run(command, shell=True, check=True, capture_output=True, text=True)
        print(f"✅ {description} completed")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ {description} failed")
        print(f"   Error: {e.stderr}")
        return False


def main():
    """Main setup process."""
    print("=" * 70)
    print("Assistant Transport Backend (Django) - Setup")
    print("=" * 70)

    # Check Python version
    check_python_version()

    # Check if we're in the right directory
    if not Path("manage.py").exists():
        print("\n❌ Error: manage.py not found")
        print("   Please run this script from the project root directory")
        sys.exit(1)

    # Optional: Create virtual environment
    print("\n" + "=" * 70)
    create_venv = input("\n💡 Create a virtual environment? (y/N): ").strip().lower()
    if create_venv in ['y', 'yes']:
        venv_name = input("   Virtual environment name (default: venv): ").strip() or "venv"
        if not run_command(f"python -m venv {venv_name}", f"Creating virtual environment '{venv_name}'"):
            print("\n⚠️  Virtual environment creation failed, continuing anyway...")
        else:
            print(f"\n💡 Activate your virtual environment:")
            if sys.platform == "win32":
                print(f"   {venv_name}\\Scripts\\activate")
            else:
                print(f"   source {venv_name}/bin/activate")
            input("\nPress Enter after activating the virtual environment...")

    # Install dependencies
    print("\n" + "=" * 70)
    print("\n📦 Installing dependencies...")

    if Path("pyproject.toml").exists():
        result = run_command("pip install -e .", "Installing package in editable mode")
        if not result:
            run_command("pip install -r requirements.txt", "Installing from requirements.txt")
    else:
        run_command("pip install -r requirements.txt", "Installing dependencies")

    # Set up .env file
    print("\n" + "=" * 70)
    env_file = Path(".env")
    example_env = Path(".env.example")

    if not env_file.exists() and example_env.exists():
        print("\n📝 Setting up environment configuration...")
        with open(example_env, 'r') as f:
            example_content = f.read()

        with open(env_file, 'w') as f:
            f.write(example_content)

        print("✅ Created .env file from .env.example")
        print("\n⚠️  Important: Edit .env and add your API keys if you want to use AI providers:")
        print("   - OPENAI_API_KEY for OpenAI integration")
        print("   - ANTHROPIC_API_KEY for Anthropic integration")
    elif env_file.exists():
        print("\n✅ .env file already exists")

    # Run Django checks
    print("\n" + "=" * 70)
    print("\n🔍 Running Django checks...")
    if run_command("python manage.py check", "Django system check"):
        print("\n✅ Django configuration is valid")

    # Print success message
    print("\n" + "=" * 70)
    print("\n🎉 Setup complete!")
    print("\n🚀 To start the server:")
    print("   python manage.py runserver")
    print("\n   Or with custom configuration:")
    print("   python run_server.py")
    print("\n📚 Read the README.md for more information")
    print("=" * 70)


if __name__ == "__main__":
    main()

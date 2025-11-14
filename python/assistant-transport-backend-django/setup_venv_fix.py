# Fix for lines 65-70
replacement = '''            print(f"\\n💡 To activate your virtual environment and continue setup:")
            if sys.platform == "win32":
                print(f"   {venv_name}\\\\Scripts\\\\activate && python setup.py")
            else:
                print(f"   source {venv_name}/bin/activate && python setup.py")
            print("\\n⚠️  Exiting - please rerun this script after activating the venv")
            sys.exit(0)
'''
with open('setup.py', 'r') as f:
    content = f.read()

# Replace the problematic section
old_section = '''            print(f"\\n💡 Activate your virtual environment:")
            if sys.platform == "win32":
                print(f"   {venv_name}\\\\Scripts\\\\activate")
            else:
                print(f"   source {venv_name}/bin/activate")
            input("\\nPress Enter after activating the virtual environment...")'''

content = content.replace(old_section, replacement.strip())

with open('setup.py', 'w') as f:
    f.write(content)
print("Fixed venv activation")

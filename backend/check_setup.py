import os
import sys
from pathlib import Path

def check_setup():
    print("Checking setup requirements...\n")
    
    issues = []
    warnings = []
    success = []
    
    if Path(".env").exists():
        success.append("✓ .env file exists")
        
        with open(".env", 'r') as f:
            content = f.read()
            
        if "OPENAI_API_KEY" not in content or "your_openai_api_key_here" in content:
            issues.append("✗ OPENAI_API_KEY not configured in .env")
        else:
            success.append("✓ OPENAI_API_KEY is set")
        
        success.append("✓ Using modern Responses API (no assistant ID needed)")
    else:
        issues.append("✗ .env file not found (copy from .env.example)")
    
    if Path("requirements.txt").exists():
        success.append("✓ requirements.txt exists")
    else:
        issues.append("✗ requirements.txt not found")
    
    data_dir = Path("data")
    if not data_dir.exists():
        warnings.append("⚠ data/ directory doesn't exist (will be created automatically)")
    else:
        success.append("✓ data/ directory exists")
    
    print("\nSUCCESS:")
    for item in success:
        print(f"  {item}")
    
    if warnings:
        print("\nWARNINGS:")
        for item in warnings:
            print(f"  {item}")
    
    if issues:
        print("\nISSUES:")
        for item in issues:
            print(f"  {item}")
        print("\nPlease fix the issues above before starting the server.")
        return False
    
    print("\n" + "="*60)
    print("Setup check complete!")
    
    if warnings:
        print("\nWarnings found, but application should work.")
    
    print("\nNext steps:")
    print("1. Test the API: python test_openai.py")
    print("2. Start the server: python socketio_app.py")
    print("3. Test with client: python test_client.py")
    
    return True

if __name__ == "__main__":
    check_setup()

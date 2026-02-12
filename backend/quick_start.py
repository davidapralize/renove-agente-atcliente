import subprocess
import sys

def run_command(cmd, description):
    print(f"\n{'='*60}")
    print(f"{description}")
    print(f"{'='*60}")
    print(f"Running: {cmd}")
    print()
    try:
        result = subprocess.run(cmd, shell=True, check=True)
        return True
    except subprocess.CalledProcessError as e:
        print(f"Error: {e}")
        return False

def main():
    print("""
╔════════════════════════════════════════════════════════════╗
║          RENOVE CHATBOT - QUICK START WIZARD              ║
╚════════════════════════════════════════════════════════════╝
""")
    
    print("This wizard will help you set up the backend.\n")
    
    steps = [
        ("View instructions", "python instructions.py"),
        ("Check current setup", "python check_setup.py"),
        ("Test OpenAI connection", "python test_openai.py"),
        ("Test Responses API", "python setup_assistant.py"),
        ("View architecture", "python architecture.py"),
        ("Start server", "python socketio_app.py"),
        ("Run test client", "python test_client.py"),
        ("Exit", "exit")
    ]
    
    while True:
        print("\nWhat would you like to do?\n")
        for i, (desc, _) in enumerate(steps, 1):
            print(f"  {i}. {desc}")
        
        try:
            choice = input("\nEnter choice (1-8): ").strip()
            
            if not choice.isdigit() or int(choice) < 1 or int(choice) > len(steps):
                print("Invalid choice. Please try again.")
                continue
            
            idx = int(choice) - 1
            desc, cmd = steps[idx]
            
            if cmd == "exit":
                print("\nGoodbye!")
                break
            
            run_command(cmd, desc)
            
            if idx == 5:
                break
            
            input("\nPress Enter to continue...")
            
        except KeyboardInterrupt:
            print("\n\nInterrupted. Goodbye!")
            break
        except Exception as e:
            print(f"\nError: {e}")
            input("\nPress Enter to continue...")

if __name__ == "__main__":
    main()

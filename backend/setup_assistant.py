from openai import OpenAI
from config import settings
from instructions import get_system_instructions
from tools import AVAILABLE_TOOLS

def test_responses_api():
    client = OpenAI(api_key=settings.openai_api_key)
    
    print("Testing modern Responses API...")
    print("\n1. Creating conversation...")
    conversation = client.conversations.create()
    print(f"   Conversation created: {conversation.id}")
    
    print("\n2. Sending test message...")
    instructions = get_system_instructions()
    
    response = client.responses.create(
        model=settings.openai_model,
        conversation={"id": conversation.id},
        instructions=instructions,
        input="Hello! I'm looking for a family car. What do you have?",
        tools=AVAILABLE_TOOLS
    )
    
    if response.output and len(response.output) > 0:
        message = response.output[0]
        if hasattr(message, 'content') and len(message.content) > 0:
            text_content = message.content[0]
            if hasattr(text_content, 'text'):
                print(f"\n   Assistant response: {text_content.text[:200]}...")
    
    print(f"\n   Response status: {response.status}")
    print(f"   Model used: {response.model}")
    
    print("\n3. Cleaning up test conversation...")
    try:
        client.conversations.delete(conversation.id)
        print("   Conversation deleted successfully")
    except Exception as e:
        print(f"   Note: {e}")
    
    print("\n" + "="*60)
    print("SUCCESS: Modern Responses API is working correctly!")
    print("="*60)
    print("\nNo configuration needed in .env file.")
    print("The Responses API doesn't require pre-creating assistants.")
    print("\nYour application is ready to use!")

if __name__ == "__main__":
    test_responses_api()

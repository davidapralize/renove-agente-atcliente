from openai import OpenAI
from config import settings
from instructions import get_system_instructions
from tools import AVAILABLE_TOOLS
import sys

def test_api_key():
    print("Testing OpenAI API connection...")
    print(f"API Key: {settings.openai_api_key[:20]}...")
    
    try:
        client = OpenAI(api_key=settings.openai_api_key)
        
        print("\n1. Testing API key validity...")
        models = client.models.list()
        print("   ✓ API key is valid")
        
        print("\n2. Testing Conversations API...")
        conversation = client.conversations.create()
        print(f"   ✓ Conversation created: {conversation.id}")
        
        print("\n3. Testing Responses API...")
        instructions = get_system_instructions()
        response = client.responses.create(
            model=settings.openai_model,
            conversation={"id": conversation.id},
            instructions=instructions,
            input="Hello! Test message.",
            tools=AVAILABLE_TOOLS
        )
        print(f"   ✓ Response created with status: {response.status}")
        
        if response.output and len(response.output) > 0:
            output_item = response.output[0]
            if hasattr(output_item, 'content') and len(output_item.content) > 0:
                text_content = output_item.content[0]
                if hasattr(text_content, 'text'):
                    print(f"   ✓ Response text: {text_content.text[:100]}...")
        
        print("\n4. Cleaning up test conversation...")
        try:
            client.conversations.delete(conversation.id)
            print("   ✓ Test conversation deleted")
        except Exception as e:
            print(f"   Note: {e}")
        
        print("\n" + "="*60)
        print("SUCCESS: OpenAI Responses API is fully functional!")
        print("="*60)
        print("\nYour application is using the modern Responses API.")
        print("No assistant configuration needed!")
        return True
        
    except Exception as e:
        print(f"\n✗ ERROR: {e}")
        print("\nPlease check:")
        print("  1. Your .env file has a valid OPENAI_API_KEY")
        print("  2. You have sufficient API credits")
        print("  3. Your network connection is working")
        print("  4. Your OpenAI plan supports the Responses API")
        return False

if __name__ == "__main__":
    success = test_api_key()
    sys.exit(0 if success else 1)

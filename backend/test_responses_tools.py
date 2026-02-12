from openai import OpenAI
from config import settings
from tools import AVAILABLE_TOOLS
from instructions import get_system_instructions

client = OpenAI(api_key=settings.openai_api_key)

print("Testing Responses API with tools...")
print(f"Number of tools configured: {len(AVAILABLE_TOOLS)}")
print(f"Tools: {[t['function']['name'] for t in AVAILABLE_TOOLS]}")

conversation = client.conversations.create()

instructions = get_system_instructions()

response = client.responses.create(
    model=settings.openai_model,
    conversation={"id": conversation.id},
    instructions=instructions,
    tools=AVAILABLE_TOOLS,
    input="Show me available SUVs under 30000 euros"
)

print("\nResponse status:", response.status)
print("\nOutput items:")
for item in response.output:
    print(f"  Type: {item.type}")
    if hasattr(item, 'content'):
        for content in item.content:
            if hasattr(content, 'text'):
                print(f"    Text: {content.text[:200]}...")
            elif hasattr(content, 'name'):
                print(f"    Tool call: {content.name}")

print("\nTool handling:", "Automatic" if response.status == "completed" else "Manual needed")

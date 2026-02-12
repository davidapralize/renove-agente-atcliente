from openai import AsyncOpenAI
from typing import List, Dict
from datetime import datetime
from config import settings
from tools import AVAILABLE_TOOLS, execute_tool
import json

client = AsyncOpenAI(api_key=settings.openai_api_key)

def get_system_prompt() -> str:
    current_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    return f"""You are a helpful AI assistant.
Current date and time: {current_time}

You can help users with their questions and perform actions using available tools.
Be concise, friendly, and professional."""

async def process_message(user_id: str, message: str, history: List[Dict]) -> str:
    messages = [{"role": "system", "content": get_system_prompt()}]
    
    for msg in history:
        messages.append({
            "role": msg["role"],
            "content": msg["content"]
        })
    
    messages.append({"role": "user", "content": message})
    
    response = await client.chat.completions.create(
        model=settings.openai_model,
        messages=messages,
        tools=AVAILABLE_TOOLS,
        tool_choice="auto"
    )
    
    assistant_message = response.choices[0].message
    
    if assistant_message.tool_calls:
        messages.append({
            "role": "assistant",
            "content": assistant_message.content,
            "tool_calls": [
                {
                    "id": tc.id,
                    "type": tc.type,
                    "function": {
                        "name": tc.function.name,
                        "arguments": tc.function.arguments
                    }
                }
                for tc in assistant_message.tool_calls
            ]
        })
        
        for tool_call in assistant_message.tool_calls:
            function_name = tool_call.function.name
            function_args = json.loads(tool_call.function.arguments)
            
            function_response = await execute_tool(function_name, function_args)
            
            messages.append({
                "role": "tool",
                "tool_call_id": tool_call.id,
                "content": function_response
            })
        
        final_response = await client.chat.completions.create(
            model=settings.openai_model,
            messages=messages,
            tool_choice="none"
        )
        
        return final_response.choices[0].message.content
    
    return assistant_message.content or ""

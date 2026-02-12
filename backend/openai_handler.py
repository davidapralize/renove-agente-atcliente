from openai import AsyncOpenAI
from typing import List, Dict, Optional
from datetime import datetime
from config import settings
from tools import AVAILABLE_TOOLS, execute_tool
from instructions import get_system_instructions
import json

client = AsyncOpenAI(api_key=settings.openai_api_key)

async def process_message_with_responses(
    conversation_id: str,
    message: str,
    user_id: Optional[str] = None
) -> str:
    instructions = get_system_instructions()
    
    response = await client.responses.create(
        model=settings.openai_model,
        conversation={"id": conversation_id},
        instructions=instructions,
        input=message,
        tools=AVAILABLE_TOOLS
    )
    
    if response.output and len(response.output) > 0:
        output_item = response.output[0]
        if hasattr(output_item, 'content') and len(output_item.content) > 0:
            text_content = output_item.content[0]
            if hasattr(text_content, 'text'):
                return text_content.text
    
    return ""

async def process_message(user_id: str, message: str, history: List[Dict]) -> str:
    messages = [{"role": "system", "content": get_system_instructions()}]
    
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
            
            function_response = execute_tool(function_name, function_args)
            
            messages.append({
                "role": "tool",
                "tool_call_id": tool_call.id,
                "content": json.dumps(function_response) if isinstance(function_response, dict) else str(function_response)
            })
        
        final_response = await client.chat.completions.create(
            model=settings.openai_model,
            messages=messages,
            tool_choice="none"
        )
        
        return final_response.choices[0].message.content
    
    return assistant_message.content or ""

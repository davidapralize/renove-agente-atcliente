from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from contextlib import asynccontextmanager
from session_manager import session_manager
from openai_handler import process_message

@asynccontextmanager
async def lifespan(app: FastAPI):
    await session_manager.initialize()
    yield

app = FastAPI(title="AI Agent API", lifespan=lifespan)

class WhatsAppMessage(BaseModel):
    user_id: str
    message: str
    phone_number: str | None = None

class WebMessage(BaseModel):
    user_id: str
    message: str
    session_id: str | None = None

class MessageResponse(BaseModel):
    response: str
    user_id: str

@app.post("/webhook/whatsapp", response_model=MessageResponse)
async def whatsapp_webhook(data: WhatsAppMessage):
    try:
        history = await session_manager.get_history(data.user_id)
        
        response_text = await process_message(data.user_id, data.message, history)
        
        await session_manager.add_messages(data.user_id, data.message, response_text)
        
        return MessageResponse(response=response_text, user_id=data.user_id)
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/webhook/web", response_model=MessageResponse)
async def web_webhook(data: WebMessage):
    try:
        history = await session_manager.get_history(data.user_id)
        
        response_text = await process_message(data.user_id, data.message, history)
        
        await session_manager.add_messages(data.user_id, data.message, response_text)
        
        return MessageResponse(response=response_text, user_id=data.user_id)
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

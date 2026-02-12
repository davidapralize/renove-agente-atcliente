from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    openai_api_key: str
    openai_assistant_id: Optional[str] = None
    openai_model: str = "gpt-5.2"
    dealcar_api_key: Optional[str] = None
    phone_number_id: Optional[str] = None
    token_permanente: Optional[str] = None
    max_history_messages: int = 20
    session_cleanup_days: int = 7
    sessions_file: str = "data/sessions.json"
    
    class Config:
        env_file = ".env"

settings = Settings()

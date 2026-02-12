from typing import Dict, Optional
from openai import OpenAI
from config import settings
import json
import os

class ConversationManager:
    def __init__(self):
        self.client = OpenAI(api_key=settings.openai_api_key)
        self.conversations: Dict[str, str] = {}
        self.car_contexts: Dict[str, Dict] = {}
        self.storage_file = "data/conversations.json"
        self._load_conversations()
    
    def _load_conversations(self):
        if os.path.exists(self.storage_file):
            try:
                with open(self.storage_file, 'r') as f:
                    self.conversations = json.load(f)
            except Exception:
                self.conversations = {}
    
    def _save_conversations(self):
        os.makedirs(os.path.dirname(self.storage_file), exist_ok=True)
        with open(self.storage_file, 'w') as f:
            json.dump(self.conversations, f, indent=4, ensure_ascii=False)
    
    def get_or_create_conversation(self, session_id: str) -> str:
        if session_id in self.conversations:
            return self.conversations[session_id]
        
        conversation = self.client.conversations.create()
        self.conversations[session_id] = conversation.id
        self._save_conversations()
        return conversation.id
    
    def delete_conversation(self, session_id: str) -> bool:
        if session_id in self.conversations:
            conversation_id = self.conversations[session_id]
            try:
                self.client.conversations.delete(conversation_id)
            except Exception:
                pass
            del self.conversations[session_id]
            self._save_conversations()
            return True
        return False
    
    def clear_all_conversations(self):
        for conversation_id in self.conversations.values():
            try:
                self.client.conversations.delete(conversation_id)
            except Exception:
                pass
        self.conversations.clear()
        self._save_conversations()
    
    def set_car_context(self, session_id: str, car_data: Dict):
        self.car_contexts[session_id] = car_data
    
    def get_car_context(self, session_id: str) -> Optional[Dict]:
        return self.car_contexts.get(session_id)

conversation_manager = ConversationManager()

import json
from pathlib import Path
from typing import Dict, Optional
from datetime import datetime, timedelta
from openai import OpenAI
from config import settings

class ThreadManager:
    def __init__(self):
        self.threads: Dict[str, str] = {}
        self.threads_file = Path("data/threads.json")
        self.client = OpenAI(api_key=settings.openai_api_key)
        self._load_threads()
    
    def _load_threads(self):
        self.threads_file.parent.mkdir(parents=True, exist_ok=True)
        if self.threads_file.exists():
            with open(self.threads_file, 'r', encoding='utf-8') as f:
                content = f.read()
                self.threads = json.loads(content) if content else {}
        else:
            self.threads = {}
            self._save_threads()
    
    def _save_threads(self):
        with open(self.threads_file, 'w', encoding='utf-8') as f:
            json.dump(self.threads, f, indent=2, ensure_ascii=False)
    
    def get_or_create_thread(self, session_id: str) -> str:
        if session_id in self.threads:
            return self.threads[session_id]
        
        thread = self.client.beta.threads.create()
        self.threads[session_id] = thread.id
        self._save_threads()
        return thread.id
    
    def add_message(self, thread_id: str, content: str) -> None:
        self.client.beta.threads.messages.create(
            thread_id=thread_id,
            role="user",
            content=content
        )
    
    def delete_thread(self, session_id: str) -> bool:
        if session_id in self.threads:
            try:
                self.client.beta.threads.delete(self.threads[session_id])
            except:
                pass
            del self.threads[session_id]
            self._save_threads()
            return True
        return False

thread_manager = ThreadManager()

import json
import asyncio
import aiofiles
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List
from config import settings

class SessionManager:
    def __init__(self):
        self.sessions: Dict[str, List[Dict]] = {}
        self.save_lock = asyncio.Lock()
        self.pending_save = False
        self.sessions_file = Path(settings.sessions_file)
        
    async def initialize(self):
        self.sessions_file.parent.mkdir(parents=True, exist_ok=True)
        if self.sessions_file.exists():
            async with aiofiles.open(self.sessions_file, 'r', encoding='utf-8') as f:
                content = await f.read()
                self.sessions = json.loads(content) if content else {}
        else:
            self.sessions = {}
            await self._save_now()
    
    async def get_history(self, user_id: str) -> List[Dict]:
        if user_id not in self.sessions:
            self.sessions[user_id] = []
        
        await self._cleanup_old_messages(user_id)
        return self.sessions[user_id]
    
    async def add_messages(self, user_id: str, user_message: str, assistant_message: str):
        if user_id not in self.sessions:
            self.sessions[user_id] = []
        
        timestamp = datetime.now().isoformat()
        
        self.sessions[user_id].append({
            "role": "user",
            "content": user_message,
            "timestamp": timestamp
        })
        
        self.sessions[user_id].append({
            "role": "assistant",
            "content": assistant_message,
            "timestamp": timestamp
        })
        
        self.sessions[user_id] = self.sessions[user_id][-settings.max_history_messages:]
        
        await self._schedule_save()
    
    async def _cleanup_old_messages(self, user_id: str):
        if user_id not in self.sessions:
            return
        
        cutoff_date = datetime.now() - timedelta(days=settings.session_cleanup_days)
        
        self.sessions[user_id] = [
            msg for msg in self.sessions[user_id]
            if datetime.fromisoformat(msg.get("timestamp", datetime.now().isoformat())) > cutoff_date
        ]
    
    async def _schedule_save(self):
        async with self.save_lock:
            if not self.pending_save:
                self.pending_save = True
                asyncio.create_task(self._debounced_save())
    
    async def _debounced_save(self):
        await asyncio.sleep(0.1)
        await self._save_now()
        async with self.save_lock:
            self.pending_save = False
    
    async def _save_now(self):
        async with aiofiles.open(self.sessions_file, 'w', encoding='utf-8') as f:
            await f.write(json.dumps(self.sessions, indent=2, ensure_ascii=False))

session_manager = SessionManager()

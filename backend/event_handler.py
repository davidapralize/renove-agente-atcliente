from openai import AssistantEventHandler
from typing_extensions import override
from tools import execute_tool
import json

class StreamEventHandler(AssistantEventHandler):
    def __init__(self, socketio_instance, session_id):
        super().__init__()
        self.socketio = socketio_instance
        self.session_id = session_id
        self.current_text = ""
        
    @override
    def on_text_created(self, text) -> None:
        self.socketio.emit('chat_token', {
            'token': '',
            'type': 'text_start',
            'session_id': self.session_id
        })
    
    @override
    def on_text_delta(self, delta, snapshot):
        if delta.value:
            self.current_text += delta.value
            self.socketio.emit('chat_token', {
                'token': delta.value,
                'type': 'text_delta',
                'session_id': self.session_id
            })
    
    @override
    def on_text_done(self, text):
        self.socketio.emit('chat_token', {
            'token': '',
            'type': 'text_complete',
            'session_id': self.session_id,
            'full_text': self.current_text
        })
        self.current_text = ""
    
    @override
    def on_tool_call_created(self, tool_call):
        if tool_call.type == 'function':
            status_map = {
                'get_car_inventory': 'searching_inventory',
                'book_test_drive': 'booking_appointment',
                'get_financing_options': 'calculating_financing'
            }
            
            status = status_map.get(tool_call.function.name, 'processing')
            message = self._get_status_message(tool_call.function.name)
            
            self.socketio.emit('status', {
                'status': status,
                'message': message,
                'session_id': self.session_id,
                'show_skeleton': True
            })
    
    @override
    def on_tool_call_done(self, tool_call):
        if tool_call.type == 'function':
            try:
                arguments = json.loads(tool_call.function.arguments)
                result = execute_tool(tool_call.function.name, arguments)
                
                ui_type = self._get_ui_type(tool_call.function.name)
                
                self.socketio.emit('ui_element', {
                    'type': ui_type,
                    'data': result,
                    'function': tool_call.function.name,
                    'session_id': self.session_id
                })
                
                self.socketio.emit('status', {
                    'status': 'ready',
                    'message': 'Processing complete',
                    'session_id': self.session_id
                })
            except Exception as e:
                self.socketio.emit('error', {
                    'message': f'Tool execution error: {str(e)}',
                    'session_id': self.session_id
                })
    
    def _get_ui_type(self, function_name: str) -> str:
        ui_mapping = {
            'get_car_inventory': 'car_cards',
            'book_test_drive': 'booking_confirmation',
            'get_financing_options': 'financing_table'
        }
        return ui_mapping.get(function_name, 'data_display')
    
    def _get_status_message(self, function_name: str) -> str:
        messages = {
            'get_car_inventory': 'Searching our inventory...',
            'book_test_drive': 'Booking your test drive...',
            'get_financing_options': 'Calculating financing options...'
        }
        return messages.get(function_name, f'Processing {function_name}...')
    
    @override
    def on_event(self, event):
        if event.event == 'thread.run.requires_action':
            self.socketio.emit('status', {
                'status': 'requires_action',
                'session_id': self.session_id
            })
        elif event.event == 'thread.run.completed':
            self.socketio.emit('status', {
                'status': 'completed',
                'session_id': self.session_id
            })
        elif event.event == 'thread.run.failed':
            self.socketio.emit('error', {
                'message': 'Run failed',
                'session_id': self.session_id
            })

print(r"""
================================================================================
                    RENOVE CHATBOT - BACKEND ARCHITECTURE
================================================================================

                        ┌─────────────────────────┐
                        │   Frontend (Browser)    │
                        │   - Socket.IO Client    │
                        │   - React/Vue/Vanilla   │
                        └───────────┬─────────────┘
                                    │
                            WebSocket (SocketIO)
                                    │
                        ┌───────────▼─────────────┐
                        │   socketio_app.py       │
                        │   - Flask + SocketIO    │
                        │   - Event Routing       │
                        │   - CORS Enabled        │
                        └───────────┬─────────────┘
                                    │
                    ┌───────────────┼────────────────────┐
                    │               │                    │
        ┌───────────▼──────────┐  ┌▼──────────┐  ┌──▼──────────┐
        │conversation_manager  │  │config.py  │  │  tools.py   │
        │- Conversation Create │  │- Settings │  │ - Functions │
        │- Session Mapping     │  │- API Keys │  │ - Execute   │
        └───────────┬──────────┘  └───────────┘  └──┬──────────┘
                    │                                │
                    │         ┌──────────────────────┘
                    │         │
        ┌───────────▼─────────▼──────────────┐
        │   OpenAI Responses API (Modern)    │
        │   - Conversations                  │
        │   - No pre-created Assistants      │
        │   - Streaming Support              │
        │   - Built-in Tool Handling         │
        └────────────┬───────────────────────┘
                     │
                     │ Event Stream
                     │
        ┌────────────▼───────────────────────┐
        │      socketio_app.py               │
        │   - Stream Event Handler           │
        │   - text_delta events              │
        │   - tool_call events               │
        │   - Status & UI Components         │
        └────────────┬───────────────────────┘
                     │
                     │ Emit via SocketIO
                     │
        ┌────────────▼───────────────────────┐
        │         Client Events              │
        │   - chat_token (streaming text)    │
        │   - ui_element (visual data)       │
        │   - status (loading states)        │
        └────────────────────────────────────┘

================================================================================
                            EVENT FLOW DIAGRAM
================================================================================

User Types Message
        │
        ▼
┌────────────────────┐
│ Frontend sends     │
│ 'message' event    │──────┐
└────────────────────┘      │
                            ▼
                    ┌───────────────────┐
                    │ SocketIO receives │
                    │ and validates     │
                    └─────────┬─────────┘
                              │
                              ▼
                    ┌───────────────────────┐
                    │ Get/Create            │
                    │ Conversation for      │
                    │ session_id            │
                    └─────────┬─────────────┘
                              │
                              ▼
                    ┌───────────────────────┐
                    │ Call Responses API    │
                    │ with streaming=True   │
                    └─────────┬─────────────┘
                              │
                              ▼
                    ┌───────────────────────┐
                    │ Process stream events │
                    │ in real-time          │
                    └─────────┬─────────────┘
                              │
            ┌─────────────────┼─────────────────┐
            │                 │                 │
            ▼                 ▼                 ▼
    ┌────────────┐   ┌───────────────┐   ┌──────────┐
    │ Text Delta │   │  Tool Call    │   │  Status  │
    │   Events   │   │    Events     │   │  Events  │
    └──────┬─────┘   └───────┬───────┘   └─────┬────┘
           │                 │                  │
           ▼                 ▼                  ▼
    ┌────────────┐   ┌───────────────┐   ┌──────────┐
    │ Emit       │   │ Execute Tool  │   │ Emit     │
    │ chat_token │   │ + Emit        │   │ status   │
    │            │   │ ui_element    │   │          │
    └──────┬─────┘   └───────┬───────┘   └─────┬────┘
           │                 │                  │
           └─────────────────┼──────────────────┘
                             │
                             ▼
                    ┌───────────────────┐
                    │ Emit              │
                    │ message_complete  │
                    └─────────┬─────────┘
                              │
                              ▼
                    ┌───────────────────┐
                    │ Frontend renders  │
                    │ complete response │
                    └───────────────────┘

================================================================================
                            KEY COMPONENTS
================================================================================

socketio_app.py (Main Server)
├── Flask application with SocketIO
├── CORS enabled for cross-origin requests
├── Event handlers for: message, connect, disconnect, clear_session, ping
├── Uses Responses API with streaming
├── Handles stream events directly
└── Port: 5000

conversation_manager.py (Session Management)
├── Maps session_id to OpenAI conversation_id
├── Creates new conversations on demand
├── Persists conversations to data/conversations.json
├── Cleanup capabilities
└── Modern Responses API integration

tools.py (Business Logic)
├── Tool definitions for OpenAI Assistant
├── Functions:
│   ├── get_car_inventory()
│   ├── book_test_drive()
│   └── get_financing_options()
└── Returns structured data for UI rendering

config.py (Configuration)
├── Environment variables via pydantic
├── Required:
│   ├── OPENAI_API_KEY
│   └── OPENAI_MODEL (default: gpt-4o)
└── Optional: DEALCAR_API_KEY, session settings

instructions.py (System Instructions)
├── get_system_instructions() function
├── Returns dynamic system prompt
└── Includes current date/time context

================================================================================
                        SETUP & DEPLOYMENT
================================================================================

Development:
  python socketio_app.py
  → Runs on http://localhost:5000
  → Debug mode enabled
  → Auto-reload on code changes

Production:
  gunicorn --worker-class eventlet -w 1 socketio_app:app
  → Uses eventlet worker
  → Single worker (required for SocketIO)
  → Production-ready WSGI server

Testing:
  python test_client.py
  → Connects via SocketIO
  → Sends test messages
  → Shows streaming in console

Demo:
  Open demo.html in browser
  → Visual interface
  → Shows streaming text
  → Renders UI elements

================================================================================
""")

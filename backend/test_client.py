import socketio
import time

sio = socketio.Client()

@sio.event
def connect():
    print("\n[CONNECTED] Successfully connected to server")

@sio.event
def connected(data):
    print(f"[INFO] {data}")

@sio.event
def chat_token(data):
    if data.get('type') == 'text_delta' and data.get('token'):
        print(data['token'], end='', flush=True)
    elif data.get('type') == 'text_complete':
        print("\n")

@sio.event
def ui_element(data):
    print(f"\n[UI ELEMENT] Type: {data.get('type')}")
    print(f"Data: {data.get('data')}")

@sio.event
def status(data):
    print(f"\n[STATUS] {data.get('message')} (Status: {data.get('status')})")

@sio.event
def error(data):
    print(f"\n[ERROR] {data.get('message')}")

@sio.event
def message_complete(data):
    print(f"\n[COMPLETE] Message processing finished")

@sio.event
def disconnect():
    print("\n[DISCONNECTED] Connection closed")

def send_test_messages():
    messages = [
        "Hola, busco un coche familiar",
        "Que coches teneis disponibles?",
        "Me gustaria reservar una prueba de conduccion"
    ]
    
    for msg in messages:
        print(f"\n\n{'='*60}")
        print(f"[USER] {msg}")
        print('='*60)
        
        sio.emit('message', {'message': msg})
        time.sleep(5)

if __name__ == '__main__':
    try:
        print("Connecting to server at http://localhost:5000...")
        sio.connect('http://localhost:5000')
        
        time.sleep(1)
        
        send_test_messages()
        
        time.sleep(3)
        sio.disconnect()
        
    except Exception as e:
        print(f"Error: {e}")

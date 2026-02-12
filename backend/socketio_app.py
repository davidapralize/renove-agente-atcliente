"""
SOCKETIO EVENT PROTOCOL:

Client -> Server:
- 'message': Send user message {message: str, session_id?: str}
- 'set_page_context': Set page URL context {session_id: str, page_url: str}
- 'clear_session': Clear conversation {session_id?: str}
- 'ping': Health check

Server -> Client:
- 'connected': Connection established {session_id: str, message: str}
- 'car_detected': Car detected from URL {session_id: str, car_name: str}
- 'chat_token': Streaming text {token: str, type: 'text_start'|'text_delta'|'text_complete', session_id: str}
- 'ui_element': Visual component {type: str, data: object, function: str, session_id: str}
- 'status': Processing status {status: str, message: str, session_id: str}
- 'error': Error occurred {message: str, session_id: str}
- 'message_complete': Processing done {session_id: str, status: str}
- 'session_cleared': Session cleared {session_id: str, success: bool}
- 'pong': Ping response {timestamp: str}
"""

from flask import Flask, request, send_from_directory
from flask_socketio import SocketIO, emit
from flask_cors import CORS
from openai import OpenAI
from config import settings
from conversation_manager import conversation_manager
from tools import AVAILABLE_TOOLS, execute_tool, extract_car_id_from_url, fetch_car_by_id, format_vehicle_response
from instructions import get_system_instructions
import uuid
import json
import os

app = Flask(__name__)
app.config['SECRET_KEY'] = 'your-secret-key-here'
CORS(app, resources={r"/*": {"origins": "*"}})

socketio = SocketIO(
    app, 
    cors_allowed_origins="*", 
    async_mode='eventlet',
    path='socket.io',
    engineio_logger=False,
    logger=False
)

client = OpenAI(api_key=settings.openai_api_key)

FRONTEND_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'frontend')

@app.route('/')
def serve_index():
    return send_from_directory(FRONTEND_DIR, 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory(FRONTEND_DIR, path)

@app.route('/health')
def health_check():
    return {"status": "healthy", "service": "chatbot-backend"}

def should_filter_token(token: str, state: dict) -> bool:
    for char in token:
        if char in '{[':
            state['json_depth'] += 1
            state['is_json_block'] = True
        elif char in '}]':
            state['json_depth'] -= 1
            if state['json_depth'] <= 0:
                state['is_json_block'] = False
                state['json_depth'] = 0
    return state['is_json_block'] or state['json_depth'] > 0

def execute_and_display_tool(func_call, session_id, socketio_inst, emit_fn):
    if not func_call.get('name') or not func_call.get('arguments'):
        return None
    try:
        arguments = json.loads(func_call['arguments'])
    except json.JSONDecodeError:
        return None

    print(f"[DEBUG] Executing follow-up tool: {func_call['name']}, args: {func_call['arguments']}")
    result = execute_tool(func_call['name'], arguments)

    if func_call['name'] == 'get_car_inventory' and isinstance(result, dict) and 'cars' in result:
        cars = result.get('cars', [])
        display_ids = arguments.get('display_ids', [])
        if display_ids:
            id_to_car = {car.get('vehicleId'): car for car in cars}
            cars_to_display = [id_to_car[cid] for cid in display_ids if cid in id_to_car]
        else:
            cars_to_display = cars[:7]

        if len(cars_to_display) == 1:
            car = cars_to_display[0]
            car_images = car.get('images', [])
            main_image = car_images[0] if car_images else 'https://via.placeholder.com/400x300?text=No+Image'
            car_specs = car.get('specs', {})
            power = car_specs.get('power', '')
            hp_value = f"{power} HP" if power else ''
            emit_fn('ui_element', {
                'type': 'car_viewer',
                'data': {
                    'brand': car.get('make', ''), 'model': car.get('model', ''),
                    'year': car.get('year', ''), 'image': main_image, 'context': 'default',
                    'specs': {
                        'price': f"€{car.get('price', 0):,.0f}", 'year': str(car.get('year', '')),
                        'mileage': f"{car.get('kilometers', 0):,} km",
                        'doors': f"{car_specs.get('doors', '')} puertas" if car_specs.get('doors') else '',
                        'trunk_space': car_specs.get('trunk_space', ''),
                        'safety_rating': car_specs.get('safety_rating', ''),
                        'fuel_consumption': car_specs.get('fuel', ''),
                        'co2_emissions': car_specs.get('co2_emissions', ''),
                        'range': car_specs.get('range', ''), 'hp': hp_value,
                        '0_100_kmh': car_specs.get('0_100_kmh', ''),
                        'top_speed': car_specs.get('top_speed', ''),
                        'transmission': car_specs.get('transmission', ''),
                        'body_style': car_specs.get('body_style', ''),
                        'color': car_specs.get('color', '')
                    }
                },
                'function': func_call['name'], 'session_id': session_id
            })
        elif len(cars_to_display) > 1:
            emit_fn('ui_element', {
                'type': 'car_cards',
                'data': {'cars': cars_to_display},
                'function': func_call['name'], 'session_id': session_id
            })
        socketio_inst.sleep(0)

    elif func_call['name'] in ['book_test_drive', 'get_financing_options']:
        ui_map = {'book_test_drive': 'booking_confirmation', 'get_financing_options': 'financing_table'}
        emit_fn('ui_element', {
            'type': ui_map[func_call['name']],
            'data': result,
            'function': func_call['name'], 'session_id': session_id
        })
        socketio_inst.sleep(0)

    return result


def process_follow_up_stream(
    client, settings, conversation_id, instructions,
    function_outputs, session_id, socketio_inst, emit_fn,
    should_send_fallback, last_search_args, text_tokens_emitted,
    max_rounds=5
):
    follow_up_text_emitted = False
    pending_outputs = function_outputs

    for round_num in range(max_rounds):
        print(f"[DEBUG] Follow-up round {round_num + 1}, submitting {len(pending_outputs)} outputs...")

        json_depth = 0
        is_json_block = False
        empty_item_count = 0
        current_func = {}
        round_function_outputs = []
        has_function_calls = False

        try:
            with client.responses.create(
                model=settings.openai_model,
                conversation={"id": conversation_id},
                instructions=instructions,
                input=pending_outputs,
                tools=AVAILABLE_TOOLS,
                stream=True
            ) as stream:
                for event in stream:
                    if event.type == "response.output_item.added":
                        item = event.output_item if hasattr(event, 'output_item') else event.item
                        item_type = item.type if hasattr(item, 'type') else 'unknown'

                        if item_type == 'message':
                            empty_item_count += 1
                            if empty_item_count > 10:
                                print(f"[WARNING] Too many empty items ({empty_item_count}), breaking")
                                break
                        elif item_type == 'function_call':
                            empty_item_count = 0
                            has_function_calls = True
                            current_func = {
                                'call_id': item.call_id if hasattr(item, 'call_id') else None,
                                'name': item.name if hasattr(item, 'name') else None,
                                'arguments': ''
                            }
                            print(f"[DEBUG] Follow-up function call: {current_func['name']}")

                    elif event.type == "response.function_call_arguments.delta":
                        if hasattr(event, 'delta') and current_func:
                            current_func['arguments'] += event.delta

                    elif event.type == "response.function_call_arguments.done":
                        if current_func.get('name'):
                            result = execute_and_display_tool(current_func, session_id, socketio_inst, emit_fn)
                            if current_func.get('call_id'):
                                round_function_outputs.append({
                                    "type": "function_call_output",
                                    "call_id": current_func['call_id'],
                                    "output": json.dumps(result) if result else json.dumps({"error": "execution failed"})
                                })

                    elif event.type == "response.content_part.added":
                        if hasattr(event, 'content_part'):
                            part = event.content_part
                            if hasattr(part, 'text') and part.text:
                                empty_item_count = 0
                                filter_state = {'json_depth': json_depth, 'is_json_block': is_json_block}
                                if not should_filter_token(part.text, filter_state):
                                    follow_up_text_emitted = True
                                    text_tokens_emitted = True
                                    emit_fn('chat_token', {'token': part.text, 'type': 'text_delta', 'session_id': session_id})
                                    socketio_inst.sleep(0)
                                json_depth = filter_state['json_depth']
                                is_json_block = filter_state['is_json_block']

                    elif event.type == "response.output_text.delta":
                        if hasattr(event, 'delta'):
                            empty_item_count = 0
                            filter_state = {'json_depth': json_depth, 'is_json_block': is_json_block}
                            if not should_filter_token(event.delta, filter_state):
                                follow_up_text_emitted = True
                                text_tokens_emitted = True
                                emit_fn('chat_token', {'token': event.delta, 'type': 'text_delta', 'session_id': session_id})
                                socketio_inst.sleep(0)
                            json_depth = filter_state['json_depth']
                            is_json_block = filter_state['is_json_block']

                    elif event.type == "response.completed":
                        print(f"[DEBUG] Follow-up round {round_num + 1} completed")
                        break

        except Exception as e:
            print(f"[ERROR] Exception in follow-up round {round_num + 1}: {str(e)}")
            import traceback
            traceback.print_exc()
            break

        if follow_up_text_emitted:
            print(f"[DEBUG] Text emitted in round {round_num + 1}, done")
            break

        if has_function_calls and round_function_outputs:
            pending_outputs = round_function_outputs
            continue

        print(f"[DEBUG] No text and no function calls in round {round_num + 1}, stopping")
        break

    if should_send_fallback and not follow_up_text_emitted:
        print(f"[DEBUG] Sending fallback message for empty results")
        emit_fn('status', {'status': 'ready', 'message': '', 'session_id': session_id, 'show_skeleton': False})
        socketio_inst.sleep(0)

        vehicle_desc = "ese vehículo"
        if last_search_args.get('make'):
            vehicle_desc = last_search_args['make']
            if last_search_args.get('model'):
                vehicle_desc += f" {last_search_args['model']}"
        elif last_search_args.get('body_style'):
            body_style_map = {
                'COUPE': 'coupés', 'CABRIO': 'descapotables', 'BERLINA': 'berlinas',
                'COMPACTO': 'compactos', 'FAMILIAR': 'familiares',
                'CUATRO_POR_CUATRO_SUV': 'SUVs', 'MONOVOLUMEN': 'monovolúmenes'
            }
            vehicle_desc = body_style_map.get(last_search_args['body_style'], 'ese tipo de vehículo')

        budget_phrase = f" dentro de ese presupuesto" if last_search_args.get('max_price') else ""
        fallback_message = f"""Ahora mismo no tenemos {vehicle_desc}{budget_phrase} en stock en Renove.

Si quieres, puedo solicitarlo como vehículo a la carta a través de nuestros proveedores. Para tramitarlo, dime por favor en un solo mensaje:

\u2022 Nombre y apellidos
\u2022 Teléfono
\u2022 Especificaciones del coche que buscas: presupuesto máximo, año mínimo, km máximos, combustible, y si tienes preferencia de cambio, color o equipamiento."""

        emit_fn('chat_token', {'token': fallback_message, 'type': 'text_delta', 'session_id': session_id})
        socketio_inst.sleep(0)
        text_tokens_emitted = True

    return text_tokens_emitted


@socketio.on('connect')
def handle_connect():
    session_id = request.sid
    emit('connected', {
        'session_id': session_id,
        'message': 'Conectado al servidor del chatbot'
    })

@socketio.on('disconnect')
def handle_disconnect():
    pass

@socketio.on('set_page_context')
def handle_set_page_context(data):
    try:
        session_id = data.get('session_id', request.sid)
        page_url = data.get('page_url', '')
        
        print(f"[DEBUG] set_page_context - Session: {session_id}, URL: {page_url}")
        
        if not page_url or 'renove.es' not in page_url.lower():
            print(f"[DEBUG] URL not from renove.es, skipping car detection")
            return
        
        car_id = extract_car_id_from_url(page_url)
        
        if car_id:
            print(f"[DEBUG] Extracted car ID: {car_id}")
            
            car_data = fetch_car_by_id(car_id)
            
            if car_data and 'error' not in car_data:
                print(f"[DEBUG] Car data fetched successfully")
                formatted_car = format_vehicle_response(car_data)
                conversation_manager.set_car_context(session_id, formatted_car)
                print(f"[DEBUG] Car context saved: {formatted_car.get('make')} {formatted_car.get('model')}")
                
                emit('car_detected', {
                    'session_id': session_id,
                    'car_name': f"{formatted_car.get('make', '')} {formatted_car.get('model', '')}".strip()
                })
                print(f"[DEBUG] Emitted car_detected event")
            else:
                print(f"[DEBUG] Failed to fetch car data: {car_data}")
        else:
            print(f"[DEBUG] No car ID found in URL")
    except Exception as e:
        print(f"[ERROR] Error in set_page_context: {str(e)}")
        import traceback
        traceback.print_exc()

@socketio.on('message')
def handle_message(data):
    try:
        print(f"[DEBUG] Received message event: {data}")
        message = data.get('message')
        session_id = data.get('session_id', request.sid)
        
        print(f"[DEBUG] Message: {message}, Session: {session_id}")
        
        if not message:
            emit('error', {'message': 'No se proporcionó mensaje'})
            return
        
        emit('status', {
            'status': 'processing',
            'message': 'Procesando tu mensaje...',
            'session_id': session_id
        })
        
        conversation_id = conversation_manager.get_or_create_conversation(session_id)
        print(f"[DEBUG] Using conversation_id: {conversation_id}")
        
        car_context = conversation_manager.get_car_context(session_id)
        if car_context:
            print(f"[DEBUG] Car context found: {car_context.get('make')} {car_context.get('model')}")
        
        instructions = get_system_instructions(car_context)
        print(f"[DEBUG] Instructions length: {len(instructions)}")
        
        emit('chat_token', {
            'token': '',
            'type': 'text_start',
            'session_id': session_id
        })
        socketio.sleep(0)
        
        function_outputs = []
        has_function_calls = False
        current_function_call = {}
        accumulated_text = ""
        is_json_block = False
        json_depth = 0
        text_tokens_emitted = False
        
        print(f"[DEBUG] Starting OpenAI stream...")
        with client.responses.create(
            model=settings.openai_model,
            conversation={"id": conversation_id},
            instructions=instructions,
            input=message,
            tools=AVAILABLE_TOOLS,
            stream=True
        ) as stream:
            for event in stream:
                # print(f"[DEBUG] Stream event: {event.type}")
                
                if event.type == "response.output_item.added":
                    item = event.output_item if hasattr(event, 'output_item') else event.item
                    print(f"[DEBUG] Output item added - type: {item.type if hasattr(item, 'type') else 'unknown'}")
                    if hasattr(item, 'type') and item.type == 'function_call':
                        has_function_calls = True
                        current_function_call = {
                            'call_id': item.call_id if hasattr(item, 'call_id') else None,
                            'name': item.name if hasattr(item, 'name') else None,
                            'arguments': ''
                        }
                        print(f"[DEBUG] Function call detected: {current_function_call['name']}")
                        
                        if current_function_call['name']:
                            status_map = {
                                'get_car_inventory': 'searching_inventory',
                                'book_test_drive': 'booking_appointment',
                                'get_financing_options': 'calculating_financing'
                            }
                            status = status_map.get(current_function_call['name'], 'processing')
                            emit('status', {
                                'status': status,
                                'message': f'Procesando {current_function_call["name"]}...',
                                'session_id': session_id,
                                'show_skeleton': True
                            })
                            socketio.sleep(0)
                
                elif event.type == "response.output_text.delta":
                    if hasattr(event, 'delta'):
                        filter_state = {'json_depth': json_depth, 'is_json_block': is_json_block}
                        if not should_filter_token(event.delta, filter_state):
                            text_tokens_emitted = True
                            emit('chat_token', {
                                'token': event.delta,
                                'type': 'text_delta',
                                'session_id': session_id
                            })
                            socketio.sleep(0)
                        json_depth = filter_state['json_depth']
                        is_json_block = filter_state['is_json_block']
                
                elif event.type == "response.output_item.chunk":
                    chunk = event.output_item
                    if hasattr(chunk, 'content') and len(chunk.content) > 0:
                        content = chunk.content[0]
                        if hasattr(content, 'text'):
                            filter_state = {'json_depth': json_depth, 'is_json_block': is_json_block}
                            if not should_filter_token(content.text, filter_state):
                                text_tokens_emitted = True
                                emit('chat_token', {
                                    'token': content.text,
                                    'type': 'text_delta',
                                    'session_id': session_id
                                })
                                socketio.sleep(0)
                            json_depth = filter_state['json_depth']
                            is_json_block = filter_state['is_json_block']
                
                elif event.type == "response.function_call_arguments.delta":
                    if hasattr(event, 'delta'):
                        current_function_call['arguments'] += event.delta
                
                elif event.type == "response.function_call_arguments.done":
                    print(f"[DEBUG] Function call completed: {current_function_call['name']}")
                    print(f"[DEBUG] Arguments: {current_function_call['arguments']}")
                    
                    if current_function_call.get('name') and current_function_call.get('arguments'):
                        try:
                            arguments = json.loads(current_function_call['arguments'])
                            result = execute_tool(current_function_call['name'], arguments)
                            
                            if isinstance(result, dict) and 'error' in result:
                                print(f"[ERROR] Tool '{current_function_call['name']}' returned error: {result['error']}")
                            
                            ui_type_map = {
                                'display_cars': 'car_cards',
                                'book_test_drive': 'booking_confirmation',
                                'get_financing_options': 'financing_table'
                            }
                            
                            if current_function_call['name'] == 'get_car_inventory':
                                num_cars = len(result.get('cars', [])) if isinstance(result, dict) else 0
                                print(f"[DEBUG] get_car_inventory: {num_cars} cars found, deferring display to follow-up")
                            
                            elif current_function_call['name'] in ['book_test_drive', 'get_financing_options']:
                                ui_type = ui_type_map[current_function_call['name']]
                                emit('ui_element', {
                                    'type': ui_type,
                                    'data': result,
                                    'function': current_function_call['name'],
                                    'session_id': session_id
                                })
                                socketio.sleep(0)
                            
                            if current_function_call.get('call_id'):
                                function_outputs.append({
                                    "type": "function_call_output",
                                    "call_id": current_function_call['call_id'],
                                    "output": json.dumps(result)
                                })
                                print(f"[DEBUG] Added function output for: {current_function_call['name']}")
                        except Exception as e:
                            print(f"[ERROR] Tool execution error: {str(e)}")
                            emit('error', {
                                'message': f'Error al ejecutar herramienta: {str(e)}',
                                'session_id': session_id
                            })
                            if current_function_call.get('call_id'):
                                function_outputs.append({
                                    "type": "function_call_output",
                                    "call_id": current_function_call['call_id'],
                                    "output": json.dumps({"error": str(e)})
                                })
        
        if has_function_calls and function_outputs:
            should_send_fallback = False
            last_search_args = {}
            for func_output in function_outputs:
                try:
                    output_data = json.loads(func_output.get('output', '{}'))
                    if isinstance(output_data, dict) and 'cars' in output_data:
                        if len(output_data['cars']) == 0:
                            should_send_fallback = True
                            if current_function_call.get('arguments'):
                                last_search_args = json.loads(current_function_call['arguments'])
                except:
                    pass
            
            text_tokens_emitted = process_follow_up_stream(
                client, settings, conversation_id, instructions,
                function_outputs, session_id, socketio, emit,
                should_send_fallback, last_search_args, text_tokens_emitted
            )
        
        if not text_tokens_emitted:
            print(f"[WARNING] No text tokens were emitted during entire conversation - sending fallback message")
            emit('status', {
                'status': 'ready',
                'message': '',
                'session_id': session_id,
                'show_skeleton': False
            })
            socketio.sleep(0)
            
            fallback_message = "Lo siento, ha ocurrido un problema procesando tu solicitud. ¿Podrías reformular tu pregunta o contarme más sobre lo que buscas?"
            emit('chat_token', {
                'token': fallback_message,
                'type': 'text_delta',
                'session_id': session_id
            })
            socketio.sleep(0)
        
        emit('chat_token', {
            'token': '',
            'type': 'text_complete',
            'session_id': session_id
        })
        
        print(f"[DEBUG] Message processing complete")
        emit('message_complete', {
            'session_id': session_id,
            'status': 'done'
        })
        
    except Exception as e:
        print(f"[ERROR] Exception in handle_message: {str(e)}")
        import traceback
        traceback.print_exc()
        emit('error', {
            'message': f'Error al procesar mensaje: {str(e)}',
            'session_id': session_id
        })

@socketio.on('clear_session')
def handle_clear_session(data):
    session_id = data.get('session_id', request.sid)
    success = conversation_manager.delete_conversation(session_id)
    emit('session_cleared', {
        'session_id': session_id,
        'success': success
    })

@socketio.on('ping')
def handle_ping():
    emit('pong', {'timestamp': str(uuid.uuid4())})

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)

from typing import Any, Dict, Optional
import json
from datetime import datetime
import requests
import os
import logging
import re
from config import settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

DEALCAR_API_URL = "https://api.dealcar.io/stock"
DEALER_ID = "e1cb5c3a-d3e7-496f-b077-98aa50aef206"
DEALCAR_API_KEY = settings.dealcar_api_key or ""

if not DEALCAR_API_KEY:
    logger.warning("[CONFIG] DEALCAR_API_KEY is empty. Check backend/.env or environment variables.")

def extract_car_id_from_url(url: str) -> Optional[str]:
    uuid_pattern = r'([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$'
    match = re.search(uuid_pattern, url, re.IGNORECASE)
    if match:
        return match.group(1)
    return None

def normalize_transmission(transmission: str) -> str:
    trans_upper = transmission.upper()
    if trans_upper in ["MANUAL", "M"]:
        return "M"
    elif trans_upper in ["AUTOMATIC", "AUTO", "A"]:
        return "A"
    return transmission

def normalize_ecological_label(label: str) -> str:
    label_upper = label.upper().strip()
    
    if label_upper in ["0", "CERO", "ZERO"]:
        return "0"
    elif label_upper in ["ECO"]:
        return "ECO"
    elif label_upper in ["C"]:
        return "C"
    elif label_upper in ["B"]:
        return "B"
    
    return label_upper

def format_fuel_type(fuel: str) -> str:
    if not fuel:
        return "N/D"
    
    fuel_map = {
        "DIESEL": "Diésel",
        "GASOLINE": "Gasolina",
        "ELECTRIC": "Eléctrico",
        "HYBRID": "Híbrido",
        "PLUG_IN_HYBRID": "Híbrido enchufable",
        "LIQUID_GAS": "Gas licuado",
        "HYDROGEN": "Hidrógeno",
        "NATURAL_GAS": "Gas natural",
        "GLP": "GLP"
    }
    
    upper_fuel = fuel.upper()
    return fuel_map.get(upper_fuel, fuel)

def enviar_whatsapp(to: str, message_type: str, **kwargs) -> Dict[str, Any]:
    url = "https://hook.eu2.make.com/6lpnciob6l37elsafh9xr8ucl581nxcv"
    headers = {
        "x-make-apikey": "k9dj54H85M2",
        "Content-Type": "application/json"
    }

    if not to.startswith("34"):
        to = f"34{to}"
    
    payload = {
        "type": message_type,
        "userId": to
    }
    
    if message_type == "drive_test":
        payload.update({
            "confirmation_code": kwargs.get("confirmation_code", ""),
            "coche": kwargs.get("vehicle_name", ""),
            "date": kwargs.get("booking_date", ""),
            "time": kwargs.get("booking_time", ""),
            "name": kwargs.get("customer_name", "")
        })
    elif message_type == "custom_car":
        payload.update({
            "request_code": kwargs.get("request_code", ""),
            "coche": kwargs.get("vehicle", ""),
            "name": kwargs.get("customer_name", ""),
            "observations": kwargs.get("observations", "")
        })
    
    try:
        response = requests.post(url, json=payload, headers=headers, timeout=10)
        logger.info(f"[WHATSAPP MAKE] Sent {message_type} to {to} - Status: {response.status_code}")
        logger.info(f"[WHATSAPP MAKE] Response: {response.text}")
        
        if response.status_code == 200:
            return {"success": True, "status": response.status_code}
        else:
            return {"success": False, "status": response.status_code, "error": response.text}
    except requests.RequestException as e:
        logger.error(f"[WHATSAPP MAKE] Error sending message: {str(e)}")
        return {"error": str(e)}

AVAILABLE_TOOLS = [
    {
        "type": "function",
        "name": "get_car_inventory",
        "description": "Search for available cars in the Renove dealership inventory and optionally display specific cars as cards. By default shows first 7 results. To show specific cars, provide their vehicleId values in display_ids parameter. IMPORTANT: When customer asks for multiple brands or models, use arrays to search for all of them in a single call.",
        "parameters": {
            "type": "object",
            "properties": {
                "display_ids": {
                    "description": "Optional array of vehicleId values to display as cards. If not provided, shows first 7 results. Use this to show only specific cars you mention in your response, in the exact order. Maximum 7 IDs.",
                    "type": "array",
                    "items": {"type": "string"},
                    "maxItems": 7
                },
                "make": {
                    "description": "Car brand/make. Can be a string (e.g., 'FORD') or an array of strings (e.g., ['FORD', 'TOYOTA', 'BMW']) to search multiple brands at once",
                    "oneOf": [
                        {"type": "string"},
                        {"type": "array", "items": {"type": "string"}}
                    ]
                },
                "model": {
                    "description": "Car model. Can be a string (e.g., 'FOCUS') or an array of strings (e.g., ['FOCUS', 'GOLF']) to search multiple models at once",
                    "oneOf": [
                        {"type": "string"},
                        {"type": "array", "items": {"type": "string"}}
                    ]
                },
                "version": {"type": "string", "description": "Car version/trim"},
                "max_price": {"type": "number", "description": "Maximum price in euros"},
                "min_price": {"type": "number", "description": "Minimum price in euros"},
                "year_min": {"type": "integer", "description": "Minimum registration year"},
                "year_max": {"type": "integer", "description": "Maximum registration year"},
                "fuel": {"type": "string", "description": "Fuel type: DIESEL, GASOLINE, ELECTRIC, HYBRID, PLUG_IN_HYBRID, LIQUID_GAS, HYDROGEN, NATURAL_GAS, GLP"},
                "transmission": {"type": "string", "description": "Transmission type: M (manual) or A (automatic)"},
                "body_style": {"type": "string", "description": "Body type: BERLINA (sedan), CABRIO, COMPACTO, COUPE, CUATRO_POR_CUATRO_SUV (4x4/SUV), FAMILIAR (estate/wagon), MONOVOLUMEN (MPV/minivan), SUV5P (5-door SUV), PICK_UP. For family cars, leave empty or use MONOVOLUMEN, FAMILIAR, or CUATRO_POR_CUATRO_SUV."},
                "color": {"type": "string", "description": "Car color"},
                "min_seats": {"type": "integer", "description": "Minimum number of seats (useful for families, e.g., 7 seats for large families)"},
                "max_seats": {"type": "integer", "description": "Maximum number of seats"},
                "min_doors": {"type": "integer", "description": "Minimum number of doors"},
                "max_doors": {"type": "integer", "description": "Maximum number of doors"},
                "min_power": {"type": "integer", "description": "Minimum power in CV/HP (e.g., 150 for 150 CV or more)"},
                "max_power": {"type": "integer", "description": "Maximum power in CV/HP"},
                "min_cc": {"type": "integer", "description": "Minimum engine displacement in cc"},
                "max_cc": {"type": "integer", "description": "Maximum engine displacement in cc"},
                "ecological_label": {"type": "string", "description": "Ecological label: 0/CERO (zero emissions), ECO (eco), C, B. Use '0' or 'CERO' for zero emissions vehicles."},
                "min_kilometers": {"type": "number", "description": "Minimum kilometers"},
                "max_kilometers": {"type": "number", "description": "Maximum kilometers"}
            },
            "required": []
        }
    },
    {
        "type": "function",
        "name": "book_test_drive",
        "description": "Book a test drive appointment for a specific car",
        "parameters": {
            "type": "object",
            "properties": {
                "car_id": {"type": "string", "description": "Car identifier"},
                "car_make": {"type": "string", "description": "Car brand/make (e.g., Volkswagen)"},
                "car_model": {"type": "string", "description": "Car model with year (e.g., Golf GTE (2021))"},
                "date": {"type": "string", "description": "Preferred date and time for test drive (e.g., 2026-02-17 10:00 or 2026-02-17T10:00:00)"},
                "customer_name": {"type": "string", "description": "Customer name"},
                "customer_phone": {"type": "string", "description": "Customer phone"}
            },
            "required": ["customer_name", "customer_phone"]
        }
    },
    {
        "type": "function",
        "name": "get_financing_options",
        "description": "Get financing options for a car purchase",
        "parameters": {
            "type": "object",
            "properties": {
                "car_price": {"type": "number", "description": "Car price"},
                "down_payment": {"type": "number", "description": "Down payment amount"}
            },
            "required": ["car_price"]
        }
    },
    {
        "type": "function",
        "name": "request_custom_vehicle",
        "description": "Record a custom vehicle request when the customer wants a specific car that is not in inventory. Thanks to our exclusive providers and buying power, we can get the car the customer wants. Our buys department will call the customer to get aligned and find for him their dream car. Use this when: 1) Customer directly asks to request a specific vehicle, or 2) After searching inventory and finding 0 results, proactively offer this option to the customer.",
        "parameters": {
            "type": "object",
            "properties": {
                "vehicle": {"type": "string", "description": "The vehicle the customer wants (make, model, version, year, etc.)"},
                "customer_name": {"type": "string", "description": "Customer name"},
                "customer_phone": {"type": "string", "description": "Customer phone number"},
                "observations": {"type": "string", "description": "Additional observations or specifications (optional)"}
            },
            "required": ["vehicle", "customer_name", "customer_phone"]
        }
    }
]

def fetch_dealcar_inventory(max_pages: int = 20) -> Optional[Dict[str, Any]]:
    try:
        logger.info(f"[DEALCAR API] Starting inventory fetch - Dealer ID: {DEALER_ID}")
        logger.info(f"[DEALCAR API] API Key present: {bool(DEALCAR_API_KEY)}")
        logger.info(f"[DEALCAR API] URL: {DEALCAR_API_URL}")
        
        all_vehicles = []
        page = 1
        total_pages = None
        total_elements = 0
        
        while page <= max_pages:
            params = {
                "dealerId": DEALER_ID,
                "status": "AVAILABLE",
                "page": page
            }
            headers = {
                "X-API-KEY": DEALCAR_API_KEY
            }
            
            logger.info(f"[DEALCAR API] Requesting page {page}")
            response = requests.get(DEALCAR_API_URL, params=params, headers=headers, timeout=10)
            
            if response.status_code == 401:
                logger.error(f"[DEALCAR API] Authorization failed - Status: 401")
                logger.error(f"[DEALCAR API] Response body: {response.text}")
                return {"error": "Authorization failed: Invalid or missing API key"}
            elif response.status_code == 403:
                logger.error(f"[DEALCAR API] Access forbidden - Status: 403")
                logger.error(f"[DEALCAR API] Response body: {response.text}")
                return {"error": "Access forbidden: Insufficient permissions"}
            
            response.raise_for_status()
            page_data = response.json()
            
            vehicles = page_data.get("vehicles", [])
            all_vehicles.extend(vehicles)
            
            if total_pages is None:
                total_pages = page_data.get("totalPages", 0)
                total_elements = page_data.get("totalElements", 0)
                logger.info(f"[DEALCAR API] Total pages: {total_pages}, Total elements: {total_elements}")
            
            logger.info(f"[DEALCAR API] Page {page}: Fetched {len(vehicles)} vehicles (Total so far: {len(all_vehicles)})")
            
            if page >= total_pages:
                logger.info(f"[DEALCAR API] Reached last page ({page}/{total_pages})")
                break
            
            page += 1
        
        logger.info(f"[DEALCAR API] Inventory fetch complete: {len(all_vehicles)} total vehicles")
        
        return {
            "vehicles": all_vehicles,
            "totalElements": total_elements,
            "totalPages": total_pages or page
        }
        
    except requests.RequestException as e:
        logger.error(f"[DEALCAR API] Request exception: {type(e).__name__}")
        logger.error(f"[DEALCAR API] Error details: {str(e)}")
        if hasattr(e, 'response') and e.response is not None:
            logger.error(f"[DEALCAR API] Response status: {e.response.status_code}")
            logger.error(f"[DEALCAR API] Response body: {e.response.text}")
        return {"error": f"Error fetching inventory: {str(e)}"}

def fetch_car_by_id(vehicle_id: str) -> Optional[Dict[str, Any]]:
    try:
        logger.info(f"[DEALCAR API] Fetching car by ID: {vehicle_id}")
        
        api_response = fetch_dealcar_inventory()
        
        if "error" in api_response:
            logger.error(f"[DEALCAR API] Error fetching inventory: {api_response['error']}")
            return api_response
        
        vehicles = api_response.get("vehicles", [])
        logger.info(f"[DEALCAR API] Searching through {len(vehicles)} vehicles")
        
        for vehicle in vehicles:
            if vehicle.get("vehicleId") == vehicle_id:
                logger.info(f"[DEALCAR API] Vehicle found: {vehicle.get('make')} {vehicle.get('model')}")
                return vehicle
        
        logger.warning(f"[DEALCAR API] Vehicle not found: {vehicle_id}")
        return {"error": f"Vehicle with ID {vehicle_id} not found in inventory"}
        
    except Exception as e:
        logger.error(f"[DEALCAR API] Error fetching car by ID: {str(e)}")
        return {"error": f"Error fetching car: {str(e)}"}

def normalize_make(make: str) -> str:
    return make.upper().replace("_", " ").replace("-", " ").strip()

def filter_vehicles(vehicles: list, filters: Dict[str, Any]) -> list:
    filtered = []
    
    logger.info(f"[FILTER] Starting with {len(vehicles)} vehicles")
    logger.info(f"[FILTER] Applied filters: {json.dumps(filters, indent=2)}")
    
    if filters.get("make"):
        make_filter = filters["make"]
        available_makes = set(v.get("make", "N/A") for v in vehicles)
        normalized_available = set(normalize_make(m) for m in available_makes)
        if isinstance(make_filter, list):
            logger.info(f"[FILTER] Looking for multiple makes: {make_filter}")
        else:
            logger.info(f"[FILTER] Looking for make: {make_filter}")
        logger.info(f"[FILTER] Available makes in inventory: {sorted(available_makes)}")
        logger.info(f"[FILTER] Available makes (normalized): {sorted(normalized_available)}")
    
    if filters.get("model"):
        model_filter = filters["model"]
        available_models = set(v.get("model", "N/A") for v in vehicles)
        if isinstance(model_filter, list):
            logger.info(f"[FILTER] Looking for multiple models: {model_filter}")
        else:
            logger.info(f"[FILTER] Looking for model: {model_filter}")
        logger.info(f"[FILTER] Available models in inventory: {sorted(available_models)}")
    
    if filters.get("body_style"):
        logger.info(f"[FILTER] Looking for body_style: {filters['body_style']}")
        available_body_styles = set(v.get("bodyStyle", "N/A") for v in vehicles)
        logger.info(f"[FILTER] Available body styles in API response: {available_body_styles}")
    
    for vehicle in vehicles:
        try:
            vehicle_id_str = f"{vehicle.get('make')} {vehicle.get('model')} ({vehicle.get('vehicleId', 'N/A')[:8]})"
            
            if filters.get("make"):
                make_filter = filters["make"]
                vehicle_make_normalized = normalize_make(vehicle.get("make", ""))
                
                if isinstance(make_filter, list):
                    normalized_filters = [normalize_make(m) for m in make_filter if m]
                    if not any(vehicle_make_normalized == nf or nf in vehicle_make_normalized for nf in normalized_filters):
                        logger.info(f"[FILTER] ❌ {vehicle_id_str} - make '{vehicle.get('make')}' (normalized: '{vehicle_make_normalized}') not in {normalized_filters}")
                        continue
                else:
                    make_filter_normalized = normalize_make(make_filter)
                    if vehicle_make_normalized != make_filter_normalized and make_filter_normalized not in vehicle_make_normalized:
                        logger.info(f"[FILTER] ❌ {vehicle_id_str} - make '{vehicle.get('make')}' (normalized: '{vehicle_make_normalized}') != '{make_filter_normalized}'")
                        continue
                logger.info(f"[FILTER] ✓ {vehicle_id_str} - make filter passed")
            
            if filters.get("model"):
                model_filter = filters["model"]
                vehicle_model = vehicle.get("model", "")
                vehicle_model_lower = vehicle_model.lower()
                vehicle_model_words = set(vehicle_model_lower.replace("-", " ").split())
                
                matched = False
                if isinstance(model_filter, list):
                    for m in model_filter:
                        if not m:
                            continue
                        m_lower = m.lower()
                        m_words = set(m_lower.replace("-", " ").split())
                        
                        if len(m_lower) <= 2:
                            if m_lower in vehicle_model_words:
                                matched = True
                                break
                        else:
                            if m_lower in vehicle_model_lower or any(word.startswith(m_lower) or m_lower in word for word in vehicle_model_words):
                                matched = True
                                break
                    
                    if not matched:
                        logger.info(f"[FILTER] ❌ {vehicle_id_str} - model '{vehicle.get('model')}' does not match any of {model_filter}")
                        continue
                else:
                    m_lower = model_filter.lower()
                    m_words = set(m_lower.replace("-", " ").split())
                    
                    if len(m_lower) <= 2:
                        if m_lower not in vehicle_model_words:
                            logger.info(f"[FILTER] ❌ {vehicle_id_str} - model '{vehicle.get('model')}' does not match '{model_filter}'")
                            continue
                    else:
                        if m_lower not in vehicle_model_lower and not any(word.startswith(m_lower) or m_lower in word for word in vehicle_model_words):
                            logger.info(f"[FILTER] ❌ {vehicle_id_str} - model '{vehicle.get('model')}' does not match '{model_filter}'")
                            continue
                
                logger.info(f"[FILTER] ✓ {vehicle_id_str} - model filter passed")
            
            if filters.get("version") and filters["version"].lower() not in vehicle.get("version", "").lower():
                logger.info(f"[FILTER] ❌ {vehicle_id_str} - version '{vehicle.get('version')}' does not contain '{filters['version']}'")
                continue
            
            price = vehicle.get("pricing", {}).get("price", 0)
            if isinstance(price, str):
                try:
                    price = float(price)
                except (ValueError, TypeError):
                    price = 0
            
            if filters.get("max_price") and price > filters["max_price"]:
                continue
            if filters.get("min_price") and price < filters["min_price"]:
                continue
            
            year = vehicle.get("registrationYear", 0)
            if isinstance(year, str):
                try:
                    year = int(year)
                except (ValueError, TypeError):
                    year = 0
            
            if filters.get("year_min") and year < filters["year_min"]:
                continue
            if filters.get("year_max") and year > filters["year_max"]:
                continue
            
            if filters.get("fuel") and vehicle.get("fuel", "").upper() != filters["fuel"].upper():
                continue
            
            if filters.get("transmission"):
                normalized_filter = normalize_transmission(filters["transmission"])
                vehicle_trans = vehicle.get("transmission", "").upper()
                if vehicle_trans != normalized_filter:
                    continue
            
            if filters.get("body_style"):
                requested_style = filters["body_style"].upper()
                vehicle_style = vehicle.get("bodyStyle", "").upper()
                
                family_car_styles = ["MONOVOLUMEN", "FAMILIAR", "CUATRO_POR_CUATRO_SUV", "SUV5P", "4X4"]
                
                if requested_style in family_car_styles:
                    if vehicle_style not in family_car_styles:
                        logger.debug(f"[FILTER] Rejected: {vehicle.get('make')} {vehicle.get('model')} - body_style '{vehicle.get('bodyStyle')}' not in family car styles")
                        continue
                else:
                    if vehicle_style != requested_style:
                        logger.debug(f"[FILTER] Rejected: {vehicle.get('make')} {vehicle.get('model')} - body_style '{vehicle.get('bodyStyle')}' != '{filters['body_style']}'")
                        continue
            
            if filters.get("color") and filters["color"].lower() not in vehicle.get("color", "").lower():
                continue
            
            kilometers = vehicle.get("kilometers", 0)
            if isinstance(kilometers, str):
                try:
                    kilometers = float(kilometers)
                except (ValueError, TypeError):
                    kilometers = 0
            
            if filters.get("min_kilometers") and kilometers < filters["min_kilometers"]:
                continue
            if filters.get("max_kilometers") and kilometers > filters["max_kilometers"]:
                continue
            
            vehicle_seats = vehicle.get("seats", 0)
            if isinstance(vehicle_seats, str):
                try:
                    vehicle_seats = int(vehicle_seats)
                except (ValueError, TypeError):
                    vehicle_seats = 0
            
            if filters.get("min_seats") and vehicle_seats < filters["min_seats"]:
                logger.debug(f"[FILTER] Rejected: {vehicle.get('make')} {vehicle.get('model')} - seats {vehicle_seats} < {filters['min_seats']}")
                continue
            if filters.get("max_seats") and vehicle_seats > filters["max_seats"]:
                continue
            
            vehicle_doors = vehicle.get("doors", 0)
            if isinstance(vehicle_doors, str):
                try:
                    vehicle_doors = int(vehicle_doors)
                except (ValueError, TypeError):
                    vehicle_doors = 0
            
            if filters.get("min_doors") and vehicle_doors < filters["min_doors"]:
                continue
            if filters.get("max_doors") and vehicle_doors > filters["max_doors"]:
                continue
            
            vehicle_power = vehicle.get("power", 0)
            if isinstance(vehicle_power, str):
                try:
                    vehicle_power = int(vehicle_power)
                except (ValueError, TypeError):
                    vehicle_power = 0
            
            if filters.get("min_power") and vehicle_power < filters["min_power"]:
                logger.debug(f"[FILTER] Rejected: {vehicle.get('make')} {vehicle.get('model')} - power {vehicle_power} CV < {filters['min_power']} CV")
                continue
            if filters.get("max_power") and vehicle_power > filters["max_power"]:
                continue
            
            vehicle_cc = vehicle.get("cc", 0)
            if isinstance(vehicle_cc, str):
                try:
                    vehicle_cc = int(vehicle_cc)
                except (ValueError, TypeError):
                    vehicle_cc = 0
            
            if filters.get("min_cc") and vehicle_cc < filters["min_cc"]:
                continue
            if filters.get("max_cc") and vehicle_cc > filters["max_cc"]:
                continue
            
            if filters.get("ecological_label"):
                vehicle_label = vehicle.get("ecologicalLabel", "")
                if vehicle_label:
                    normalized_filter = normalize_ecological_label(filters["ecological_label"])
                    normalized_vehicle = normalize_ecological_label(vehicle_label)
                    if normalized_vehicle != normalized_filter:
                        logger.debug(f"[FILTER] ❌ {vehicle_id_str} - ecological_label '{vehicle_label}' (normalized: '{normalized_vehicle}') != '{filters['ecological_label']}' (normalized: '{normalized_filter}')")
                        continue
                else:
                    logger.debug(f"[FILTER] ❌ {vehicle_id_str} - missing ecological_label, filter requires '{filters['ecological_label']}'")
                    continue
            
            logger.info(f"[FILTER] ✅ {vehicle_id_str} - PASSED ALL FILTERS")
            filtered.append(vehicle)
        except Exception as e:
            logger.error(f"[FILTER] Error filtering vehicle {vehicle.get('make')} {vehicle.get('model')}: {str(e)}")
            continue
    
    logger.info(f"[FILTER] Results: {len(filtered)} vehicles passed all filters out of {len(vehicles)} total")
    return filtered

def format_vehicle_response(vehicle: Dict[str, Any]) -> Dict[str, Any]:
    pricing = vehicle.get("pricing", {})
    multimedia = vehicle.get("multimediaList", [])
    image_urls = [img.get("url") for img in multimedia if img.get("type", "").startswith("image")]
    
    kilometers = vehicle.get("kilometers", 0)
    if kilometers:
        mileage_str = f"{int(kilometers):,}".replace(",", ".") + " km"
    else:
        mileage_str = "N/D"
    
    raw_fuel = vehicle.get("fuel")
    formatted_fuel = format_fuel_type(raw_fuel) if raw_fuel else None
    
    return {
        "id": vehicle.get("vehicleId"),
        "vehicleId": vehicle.get("vehicleId"),
        "link": vehicle.get("dealcarLink"),
        "brand": vehicle.get("make"),
        "make": vehicle.get("make"),
        "model": vehicle.get("model"),
        "version": vehicle.get("version"),
        "year": vehicle.get("registrationYear"),
        "price": pricing.get("price"),
        "type": vehicle.get("vehicleType"),
        "fuel": formatted_fuel,
        "mileage": mileage_str,
        "kilometers": kilometers,
        "license_plate": vehicle.get("licensePlate"),
        "image": image_urls[0] if image_urls else None,
        "specs": {
            "fuel": raw_fuel,
            "transmission": vehicle.get("transmission"),
            "power": vehicle.get("power"),
            "doors": vehicle.get("doors"),
            "seats": vehicle.get("seats"),
            "body_style": vehicle.get("bodyStyle"),
            "color": vehicle.get("color"),
            "cc": vehicle.get("cc"),
            "ecological_label": vehicle.get("ecologicalLabel")
        },
        "images": image_urls,
        "description": vehicle.get("description"),
        "warranty": vehicle.get("warranty"),
        "store": vehicle.get("store")
    }

def execute_tool(tool_name: str, arguments: Dict[str, Any]) -> Dict[str, Any]:
    logger.info(f"[TOOL EXECUTION] Tool: {tool_name}")
    logger.info(f"[TOOL EXECUTION] Arguments: {json.dumps(arguments, indent=2)}")
    
    if tool_name == "get_car_inventory":
        api_response = fetch_dealcar_inventory()
        
        if "error" in api_response:
            logger.error(f"[TOOL EXECUTION] API Error detected: {api_response['error']}")
            return api_response
        
        vehicles = api_response.get("vehicles", [])
        logger.info(f"[TOOL EXECUTION] Total vehicles from API: {len(vehicles)}")
        
        filtered_vehicles = filter_vehicles(vehicles, arguments)
        logger.info(f"[TOOL EXECUTION] Filtered vehicles: {len(filtered_vehicles)}")
        
        display_ids = arguments.get("display_ids")
        if display_ids and isinstance(display_ids, list):
            logger.info(f"[TOOL EXECUTION] display_ids provided: {display_ids}")
            
            displayed_vehicles = []
            for display_id in display_ids:
                matched = False
                for vehicle in filtered_vehicles:
                    vehicle_id = vehicle.get("vehicleId", "")
                    if vehicle_id == display_id or vehicle_id.startswith(display_id):
                        if vehicle not in displayed_vehicles:
                            displayed_vehicles.append(vehicle)
                            logger.info(f"[TOOL EXECUTION] ✓ Including vehicle: {vehicle.get('make')} {vehicle.get('model')} (ID: {vehicle_id})")
                            matched = True
                            break
                
                if not matched:
                    logger.warning(f"[TOOL EXECUTION] ⚠ Vehicle ID not found in filtered results: {display_id}")
            
            filtered_vehicles = displayed_vehicles
            logger.info(f"[TOOL EXECUTION] After display_ids filtering: {len(filtered_vehicles)} cars")
        else:
            filtered_vehicles = filtered_vehicles[:7]
            logger.info(f"[TOOL EXECUTION] No display_ids provided, showing first 7 results")
        
        result = {
            "total_available": api_response.get("totalElements", 0),
            "results_count": len(filtered_vehicles),
            "cars": [format_vehicle_response(v) for v in filtered_vehicles]
        }
        logger.info(f"[TOOL EXECUTION] Returning {len(result['cars'])} cars to OpenAI")
        return result
    
    elif tool_name == "book_test_drive":
        car_make = arguments.get("car_make", "")
        car_model = arguments.get("car_model", "")
        
        if car_make and car_model:
            vehicle_name = f"{car_make} {car_model}"
        elif car_model:
            vehicle_name = car_model
        elif car_make:
            vehicle_name = car_make
        else:
            vehicle_name = "N/D"
        
        date_str = arguments.get("date", "")
        booking_date = "N/D"
        booking_time = "N/D"
        
        if date_str:
            try:
                date_str_clean = date_str.replace("T", " ").strip()
                
                if " " in date_str_clean:
                    date_part, time_part = date_str_clean.split(" ", 1)
                    booking_date = date_part
                    
                    if ":" in time_part:
                        booking_time = time_part.split(":")[0] + ":" + time_part.split(":")[1]
                    else:
                        booking_time = time_part
                else:
                    booking_date = date_str_clean
            except Exception as e:
                logger.error(f"[TOOL EXECUTION] Error parsing date: {str(e)}")
                booking_date = date_str
        
        confirmation_code = f"TD{datetime.now().strftime('%Y%m%d%H%M')}"
        customer_phone = arguments.get("customer_phone", "")
        customer_name = arguments.get("customer_name", "")
        
        if customer_phone:
            whatsapp_result = enviar_whatsapp(
                to=customer_phone,
                message_type="drive_test",
                confirmation_code=confirmation_code,
                vehicle_name=vehicle_name,
                booking_date=booking_date,
                booking_time=booking_time,
                customer_name=customer_name
            )
            logger.info(f"[TOOL EXECUTION] WhatsApp result: {whatsapp_result}")
        
        return {
            "status": "confirmed",
            "confirmation_code": confirmation_code,
            "model": vehicle_name,
            "date": booking_date,
            "time": booking_time,
            "customer": arguments.get("customer_name"),
            "phone": customer_phone,
            "message": "Test drive booked successfully"
        }
    
    elif tool_name == "get_financing_options":
        car_price = arguments.get("car_price", 25000)
        down_payment = arguments.get("down_payment", car_price * 0.2)
        loan_amount = car_price - down_payment
        
        return {
            "options": [
                {
                    "term": "36 months",
                    "monthly_payment": round(loan_amount / 36 * 1.05, 2),
                    "interest_rate": 5.0
                },
                {
                    "term": "48 months",
                    "monthly_payment": round(loan_amount / 48 * 1.06, 2),
                    "interest_rate": 6.0
                },
                {
                    "term": "60 months",
                    "monthly_payment": round(loan_amount / 60 * 1.07, 2),
                    "interest_rate": 7.0
                }
            ]
        }
    
    elif tool_name == "request_custom_vehicle":
        vehicle = arguments.get("vehicle", "")
        customer_name = arguments.get("customer_name", "")
        customer_phone = arguments.get("customer_phone", "")
        observations = arguments.get("observations", "")
        
        request_code = f"RCV{datetime.now().strftime('%Y%m%d%H%M')}"
        
        if customer_phone:
            whatsapp_result = enviar_whatsapp(
                to=customer_phone,
                message_type="custom_car",
                request_code=request_code,
                vehicle=vehicle,
                customer_name=customer_name,
                observations=observations
            )
            logger.info(f"[TOOL EXECUTION] WhatsApp result for custom vehicle request: {whatsapp_result}")
        
        return {
            "status": "recorded",
            "request_code": request_code,
            "vehicle": vehicle,
            "customer": customer_name,
            "phone": customer_phone,
            "observations": observations,
            "message": "Custom vehicle request recorded successfully"
        }
    
    return {"error": "Unknown tool"}

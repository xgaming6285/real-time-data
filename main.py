import MetaTrader5 as mt5
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional, List, Dict
import os
import asyncio
from contextlib import asynccontextmanager
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Global state for MT5 connection
connected = False

# Timeframe mapping
TIMEFRAMES = {
    "M1": mt5.TIMEFRAME_M1,
    "M2": mt5.TIMEFRAME_M2,
    "M3": mt5.TIMEFRAME_M3,
    "M5": mt5.TIMEFRAME_M5,
    "M10": mt5.TIMEFRAME_M10,
    "M15": mt5.TIMEFRAME_M15,
    "M30": mt5.TIMEFRAME_M30,
    "H1": mt5.TIMEFRAME_H1,
    "H2": mt5.TIMEFRAME_H2,
    "H4": mt5.TIMEFRAME_H4,
    "D1": mt5.TIMEFRAME_D1,
    "W1": mt5.TIMEFRAME_W1,
    "MN1": mt5.TIMEFRAME_MN1
}

def connect_mt5():
    """Attempt to connect to MT5 using environment variables or default settings."""
    global connected
    
    # Reload env vars in case they changed
    load_dotenv(override=True)
    
    path = os.getenv("MT5_PATH", "")
    # Clean path: remove surrounding quotes if present
    path = path.strip().strip('"').strip("'")
    
    login = os.getenv("MT5_LOGIN")
    password = os.getenv("MT5_PASSWORD")
    server = os.getenv("MT5_SERVER")
    
    print(f"DEBUG: MT5_PATH='{path}'")
    
    init_args = {}
    if path:
        init_args['path'] = path
    if login:
        try:
            init_args['login'] = int(login)
        except ValueError:
            pass
    if password:
        init_args['password'] = password.strip('"').strip("'")
    if server:
        init_args['server'] = server.strip('"').strip("'")
        
    print(f"Attempting to initialize MT5 with args: {init_args}")
    
    # If already connected, shutdown first to be safe
    if connected:
        mt5.shutdown()
        
    # Attempt 1: With provided arguments
    if mt5.initialize(**init_args):
        print("MetaTrader5 package version:", mt5.__version__)
        print("MetaTrader5 connected")
        connected = True
        return True, None
    else:
        err = mt5.last_error()
        print("initialize() failed with args, error code =", err)
        
        # Attempt 2: Fallback - Try without path
        if 'path' in init_args:
            print("Retrying without path argument...")
            del init_args['path']
            if mt5.initialize(**init_args):
                print("MetaTrader5 connected (fallback)")
                connected = True
                return True, None
            else:
                err = mt5.last_error()
                print("Fallback initialize() failed, error code =", err)

        connected = False
        return False, err

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Connect to MT5
    connect_mt5()
    yield
    # Shutdown: Disconnect from MT5
    mt5.shutdown()
    print("MetaTrader5 shutdown")

app = FastAPI(title="MT5 Real-Time Data Server", lifespan=lifespan)

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {
        "status": "online",
        "mt5_connected": connected,
        "message": "Welcome to the MT5 Real-Time Data Server",
        "help": "Ensure MT5 is running. If not connected, check .env config and hit /connect"
    }

@app.get("/connect")
def connect_endpoint():
    success, error = connect_mt5()
    if success:
        return {"status": "connected", "message": "Successfully connected to MT5"}
    else:
        raise HTTPException(status_code=500, detail=f"Failed to connect to MT5. Error: {error}")

@app.get("/symbols")
def get_symbols(search: Optional[str] = None):
    if not connected:
        raise HTTPException(status_code=503, detail="MT5 not connected")
    
    symbols = mt5.symbols_get(group="*")
    
    if symbols is None:
        raise HTTPException(status_code=500, detail=f"Failed to fetch symbols. Error: {mt5.last_error()}")
    
    result = []
    for s in symbols:
        if search and search.lower() not in s.name.lower():
            continue
        result.append({
            "name": s.name,
            "path": s.path,
            "description": s.description
        })
        if not search and len(result) >= 100:
            break
            
    return {"count": len(result), "symbols": result}

@app.get("/available-symbols")
def get_available_symbols():
    if not connected:
        raise HTTPException(status_code=503, detail="MT5 not connected")
    
    symbols = mt5.symbols_get(group="*")
    
    if symbols is None:
        raise HTTPException(status_code=500, detail=f"Failed to fetch symbols. Error: {mt5.last_error()}")
    
    grouped_symbols: Dict[str, List[Dict]] = {}
    
    for s in symbols:
        path_parts = s.path.split('\\')
        category = path_parts[0] if path_parts else "Uncategorized"
        
        if category not in grouped_symbols:
            grouped_symbols[category] = []
            
        # Calculate daily change percentage
        change_percentage = 0.0
        if s.session_open > 0:
            change_percentage = ((s.bid - s.session_open) / s.session_open) * 100
        
        grouped_symbols[category].append({
            "symbol": s.name,
            "description": s.description,
            "path": s.path,
            "digits": s.digits,
            "currency_base": s.currency_base,
            "currency_profit": s.currency_profit,
            "bid": s.bid,
            "ask": s.ask,
            "change_percentage": round(change_percentage, 2)
        })
        
    return {
        "count": sum(len(v) for v in grouped_symbols.values()),
        "categories": list(grouped_symbols.keys()),
        "data": grouped_symbols
    }

@app.get("/history/{symbol}")
def get_history(symbol: str, timeframe: str = "M1", limit: int = 1000):
    """
    Get historical OHLCV data for a symbol.
    timeframe: M1, M5, ...
    limit: Number of candles to retrieve
    """
    if not connected:
        raise HTTPException(status_code=503, detail="MT5 not connected")
    
    if timeframe not in TIMEFRAMES:
        raise HTTPException(status_code=400, detail=f"Invalid timeframe. Available: {list(TIMEFRAMES.keys())}")
    
    # Check if symbol exists/select it
    if not mt5.symbol_select(symbol, True):
        raise HTTPException(status_code=404, detail=f"Symbol '{symbol}' not found")

    tf = TIMEFRAMES[timeframe]
    
    # Get rates
    rates = mt5.copy_rates_from_pos(symbol, tf, 0, limit)
    
    if rates is None:
        raise HTTPException(status_code=500, detail=f"Failed to get history for {symbol}")
    
    # Convert numpy array to list of dicts
    data = []
    for rate in rates:
        data.append({
            "time": int(rate['time']), # Unix timestamp
            "open": float(rate['open']),
            "high": float(rate['high']),
            "low": float(rate['low']),
            "close": float(rate['close']),
            "tick_volume": int(rate['tick_volume']),
            "spread": int(rate['spread']),
            "real_volume": int(rate['real_volume'])
        })
        
    return {
        "symbol": symbol,
        "timeframe": timeframe,
        "count": len(data),
        "data": data
    }

@app.get("/quote/{symbol}")
def get_quote(symbol: str):
    if not connected:
        raise HTTPException(status_code=503, detail="MT5 not connected")
    
    selected = mt5.symbol_select(symbol, True)
    if not selected:
        pass 
        
    tick = mt5.symbol_info_tick(symbol)
    
    if tick is None:
        if not mt5.symbol_select(symbol, True):
             raise HTTPException(status_code=404, detail=f"Symbol '{symbol}' not found")
        tick = mt5.symbol_info_tick(symbol)
        if tick is None:
             raise HTTPException(status_code=500, detail=f"Failed to get tick for {symbol}")
        
    return {
        "symbol": symbol,
        "time": tick.time,
        "bid": tick.bid,
        "ask": tick.ask,
        "last": tick.last,
        "volume": tick.volume,
        "time_msc": tick.time_msc,
        "flags": tick.flags,
        "volume_real": tick.volume_real
    }

@app.websocket("/ws/realtime")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    
    if not connected:
        await websocket.close(code=1000, reason="MT5 not connected")
        return

    try:
        while True:
            # Run the data fetching in a thread to avoid blocking the event loop
            data = await asyncio.to_thread(fetch_realtime_data)
            await websocket.send_json(data)
            await asyncio.sleep(1)
    except WebSocketDisconnect:
        print("Client disconnected from WebSocket")
    except Exception as e:
        print(f"WebSocket Error: {e}")
        try:
            await websocket.close(code=1011)
        except:
            pass

def fetch_realtime_data():
    """Fetch current data for all available symbols."""
    symbols = mt5.symbols_get(group="*")
    
    if symbols is None:
        return {"error": "Failed to fetch symbols", "data": []}
    
    results = []
    for s in symbols:
        results.append({
            "symbol": s.name,
            "bid": s.bid,
            "ask": s.ask,
            "time": s.time,
            "digits": s.digits
        })
        
    return {"count": len(results), "data": results}

if __name__ == "__main__":
    import uvicorn
    # Listen on all interfaces
    uvicorn.run(app, host="0.0.0.0", port=8001)

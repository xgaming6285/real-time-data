# Real-Time Data Server (MT5)

This project exposes a local server to provide real-time financial data fetched from MetaTrader 5.

## Quick Start

1.  **Install Requirements**:

    ```bash
    pip install -r requirements.txt
    ```

2.  **MetaTrader 5 Setup**:

    - **Option A (Recommended)**: Open MetaTrader 5 manually and log in to your account.
    - **Option B (Auto-launch)**: Configure the path in `.env` to let the script launch MT5.

3.  **Configuration**:
    Create a file named `.env` in this folder:

    ```env
    # Leave empty if MT5 is already running
    MT5_PATH=""

    # Optional login details (if you want auto-login upon launch)
    # MT5_LOGIN=123456
    # MT5_PASSWORD=secret
    # MT5_SERVER=Broker-Server
    ```

    _If you need the script to launch MT5 for you, set the path:_

    ```env
    MT5_PATH="C:\Program Files\MetaTrader 5\terminal64.exe"
    ```

4.  **Run Server**:
    ```bash
    uvicorn main:app --host 0.0.0.0 --port 8001 --reload
    ```
    - Access at: `http://localhost:8001`

## API Usage

- **Check Connection**: `GET /` or `GET /connect` (to retry connection)
- **Get Quote**: `GET /quote/EURUSD`
- **List Symbols**: `GET /symbols`

## Troubleshooting

- **"MetaTrader 5 x64 not found"**:
  1.  Ensure MT5 is running.
  2.  If trying to auto-launch, check `MT5_PATH` in `.env`.
  3.  Call `http://localhost:8001/connect` to retry.

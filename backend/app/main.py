from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import httpx
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

# CORS configuration
origins = [
    "http://localhost:5173",  # Allow frontend origin
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"Hello": "World"}

@app.get("/api/weather")
async def get_weather(lat: float | None = None, lon: float | None = None):
    api_key = os.getenv("OPENWEATHERMAP_API_KEY")
    if not api_key or api_key == "YOUR_API_KEY_HERE":
        raise HTTPException(status_code=500, detail="API key not configured")

    # Use provided lat/lon or default to Tokyo
    if lat is None or lon is None:
        lat = 35.6895  # Default latitude for Tokyo
        lon = 139.6917 # Default longitude for Tokyo
    
    url = f"https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&appid={api_key}&units=metric&lang=ja"

    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url)
            response.raise_for_status()  # Raise an exception for bad status codes
            data = response.json()
            
            # Extract relevant data
            description = data.get("weather", [{}])[0].get("description", "")
            icon_code = data.get("weather", [{}])[0].get("icon", "")
            weather = {
                "city": data.get("name", "不明"),
                "description": description,
                "temperature": data.get("main", {}).get("temp", 0),
                "icon": icon_code,
            }
            return weather
        except httpx.HTTPStatusError as e:
            raise HTTPException(status_code=e.response.status_code, detail="Error fetching weather data")
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
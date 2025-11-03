import os
import datetime
from dotenv import load_dotenv

# This environment variable allows OAuth2 to work with HTTP. Required for local development.
os.environ['OAUTHLIB_INSECURE_TRANSPORT'] = '1'

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import RedirectResponse
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware

from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
import httpx
from pydantic import BaseModel

# Load environment variables from .env file
load_dotenv()

# --- Environment Variable Validation ---
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
SESSION_SECRET_KEY = os.getenv("SESSION_SECRET_KEY")
NOTION_API_KEY = os.getenv("NOTION_API_KEY")
NOTION_DATABASE_ID = os.getenv("NOTION_DATABASE_ID")

if not all([GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, SESSION_SECRET_KEY]):
    raise ValueError("Google OAuth environment variables are not set. Please check your .env file.")

if not all([NOTION_API_KEY, NOTION_DATABASE_ID]):
    print("Notion environment variables (NOTION_API_KEY, NOTION_DATABASE_ID) are not fully set. Notion integration will be disabled.")
    NOTION_API_KEY = None
    NOTION_DATABASE_ID = None

# --- FastAPI App Initialization ---
app = FastAPI()

# --- Middleware ---
app.add_middleware(SessionMiddleware, secret_key=SESSION_SECRET_KEY)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Google OAuth Configuration ---
CLIENT_SECRETS_CONFIG = {
    "web": {
        "client_id": GOOGLE_CLIENT_ID,
        "client_secret": GOOGLE_CLIENT_SECRET,
        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
        "token_uri": "https://oauth2.googleapis.com/token",
        "redirect_uris": ["http://localhost:8000/auth/google/callback"],
    }
}
SCOPES = ["https://www.googleapis.com/auth/calendar.readonly"]
REDIRECT_URI = "http://localhost:8000/auth/google/callback"

# --- Helper Functions ---
def get_credentials(request: Request):
    if 'credentials' not in request.session:
        return None
    credentials_dict = request.session['credentials']
    return Credentials(**credentials_dict)

# --- API Endpoints ---

@app.get("/api/auth/status")
def auth_status(request: Request):
    credentials = get_credentials(request)
    if credentials and credentials.valid:
        return {"authenticated": True}
    return {"authenticated": False}

@app.get("/auth/google")
def auth_google():
    flow = Flow.from_client_config(CLIENT_SECRETS_CONFIG, scopes=SCOPES, redirect_uri=REDIRECT_URI)
    authorization_url, _ = flow.authorization_url(access_type='offline', include_granted_scopes='true')
    return RedirectResponse(authorization_url)

@app.get("/auth/google/callback")
async def auth_google_callback(request: Request):
    try:
        flow = Flow.from_client_config(CLIENT_SECRETS_CONFIG, scopes=SCOPES, redirect_uri=REDIRECT_URI)
        flow.fetch_token(authorization_response=str(request.url))
        credentials = flow.credentials
        request.session['credentials'] = {
            'token': credentials.token,
            'refresh_token': credentials.refresh_token,
            'token_uri': credentials.token_uri,
            'client_id': credentials.client_id,
            'client_secret': credentials.client_secret,
            'scopes': credentials.scopes
        }
        return RedirectResponse("http://localhost:5173")
    except Exception as e:
        print(f"Error in callback: {e}")
        raise HTTPException(status_code=500, detail="Authentication callback failed.")

@app.get("/api/auth/logout")
def auth_logout(request: Request):
    request.session.pop('credentials', None)
    return {"message": "Logged out successfully"}

@app.get("/api/google-calendar/events")
def get_calendar_events(request: Request, date: str | None = None):
    credentials = get_credentials(request)
    if not credentials or not credentials.valid:
        raise HTTPException(status_code=401, detail="Not authenticated")

    try:
        service = build('calendar', 'v3', credentials=credentials)
        
        if date:
            target_date = datetime.datetime.strptime(date, "%Y-%m-%d").date()
        else:
            target_date = datetime.datetime.utcnow().date()

        time_min = datetime.datetime.combine(target_date, datetime.time.min).isoformat() + 'Z'
        time_max = datetime.datetime.combine(target_date, datetime.time.max).isoformat() + 'Z'

        events_result = service.events().list(
            calendarId='primary', timeMin=time_min, timeMax=time_max, maxResults=10, singleEvents=True, orderBy='startTime'
        ).execute()
        
        events = events_result.get('items', [])
        if not events:
            return []
            
        return [{"summary": event["summary"], "start": event["start"].get("dateTime", event["start"].get("date"))} for event in events]

    except HttpError as error:
        print(f'An error occurred: {error}')
        raise HTTPException(status_code=500, detail=f"Failed to fetch calendar events: {error}")

@app.get("/api/notion/tasks")
async def get_notion_tasks():
    if not NOTION_API_KEY or not NOTION_DATABASE_ID:
        raise HTTPException(status_code=500, detail="Notion integration is not configured.")

    headers = {
        "Authorization": f"Bearer {NOTION_API_KEY}",
        "Content-Type": "application/json",
        "Notion-Version": "2022-06-28",
    }

    url = f"https://api.notion.com/v1/databases/{NOTION_DATABASE_ID}/query"

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(url, headers=headers)
            response.raise_for_status()  # Raise an exception for bad status codes
            data = response.json()

        results = data.get("results")
        tasks = []
        for page in results:
            properties = page.get("properties", {})
            title_property = properties.get("名前", {}).get("title")
            if title_property:
                # Ensure title_property is not empty and is a list
                if isinstance(title_property, list) and title_property:
                    title = title_property[0].get("plain_text")
                    status_property = properties.get("Status", {}).get("status", {})
                    status = status_property.get("name") if status_property else None
                    date_property = properties.get("日付", {}).get("date")
                    date = date_property.get("start") if date_property else None
                    type_property = properties.get("種類", {}).get("select", {})
                    task_type = type_property.get("name") if type_property else None
                    tasks.append({"id": page["id"], "title": title, "status": status, "date": date, "type": task_type})
        return tasks

    except httpx.HTTPStatusError as e:
        # Log the detailed error from Notion API
        print(f"Error fetching Notion tasks: {e.response.text}")
        raise HTTPException(status_code=e.response.status_code, detail=f"Failed to fetch Notion tasks: {e.response.text}")
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
        raise HTTPException(status_code=500, detail="An unexpected error occurred while fetching Notion tasks.")

from typing import Optional

class UpdateTaskRequest(BaseModel):
    title: Optional[str] = None
    status: Optional[str] = None
    task_type: Optional[str] = None
    date: Optional[str] = None

@app.patch("/api/notion/tasks/{task_id}")
async def update_task(task_id: str, request_body: UpdateTaskRequest):
    if not NOTION_API_KEY:
        raise HTTPException(status_code=500, detail="Notion integration is not configured.")

    headers = {
        "Authorization": f"Bearer {NOTION_API_KEY}",
        "Content-Type": "application/json",
        "Notion-Version": "2022-06-28",
    }

    url = f"https://api.notion.com/v1/pages/{task_id}"

    properties = {}
    if request_body.title is not None:
        properties["名前"] = {"title": [{"text": {"content": request_body.title}}]}
    if request_body.status is not None:
        properties["Status"] = {"status": {"name": request_body.status}}
    if request_body.task_type is not None:
        properties["種類"] = {"select": {"name": request_body.task_type}}
    if request_body.date is not None:
        properties["日付"] = {"date": {"start": request_body.date}}

    payload = {"properties": properties}

    try:
        async with httpx.AsyncClient() as client:
            response = await client.patch(url, headers=headers, json=payload)
            response.raise_for_status()
            return response.json()
    except httpx.HTTPStatusError as e:
        print(f"Error updating Notion task: {e.response.text}")
        raise HTTPException(status_code=e.response.status_code, detail=f"Failed to update Notion task: {e.response.text}")
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
        raise HTTPException(status_code=500, detail="An unexpected error occurred while updating Notion task.")

class CreateTaskRequest(BaseModel):
    title: str
    status: str
    task_type: str
    date: str

@app.post("/api/notion/tasks")
async def create_task(request_body: CreateTaskRequest):
    if not NOTION_API_KEY or not NOTION_DATABASE_ID:
        raise HTTPException(status_code=500, detail="Notion integration is not configured.")

    headers = {
        "Authorization": f"Bearer {NOTION_API_KEY}",
        "Content-Type": "application/json",
        "Notion-Version": "2022-06-28",
    }

    url = "https://api.notion.com/v1/pages"

    payload = {
        "parent": { "database_id": NOTION_DATABASE_ID },
        "properties": {
            "名前": {
                "title": [
                    {
                        "text": {
                            "content": request_body.title
                        }
                    }
                ]
            },
            "Status": {
                "status": {
                    "name": request_body.status
                }
            },
            "種類": {
                "select": {
                    "name": request_body.task_type
                }
            },
            "日付": {
                "date": {
                    "start": request_body.date
                }
            }
        }
    }

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(url, headers=headers, json=payload)
            response.raise_for_status()
            return response.json()
    except httpx.HTTPStatusError as e:
        print(f"Error creating Notion task: {e.response.text}")
        raise HTTPException(status_code=e.response.status_code, detail=f"Failed to create Notion task: {e.response.text}")
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
        raise HTTPException(status_code=500, detail="An unexpected error occurred while creating Notion task.")

@app.delete("/api/notion/tasks/{task_id}")
async def delete_task(task_id: str):
    if not NOTION_API_KEY:
        raise HTTPException(status_code=500, detail="Notion integration is not configured.")

    headers = {
        "Authorization": f"Bearer {NOTION_API_KEY}",
        "Content-Type": "application/json",
        "Notion-Version": "2022-06-28",
    }

    url = f"https://api.notion.com/v1/pages/{task_id}"

    payload = {"archived": True}

    try:
        async with httpx.AsyncClient() as client:
            response = await client.patch(url, headers=headers, json=payload)
            response.raise_for_status()
            return response.json()
    except httpx.HTTPStatusError as e:
        print(f"Error deleting Notion task: {e.response.text}")
        raise HTTPException(status_code=e.response.status_code, detail=f"Failed to delete Notion task: {e.response.text}")
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
        raise HTTPException(status_code=500, detail="An unexpected error occurred while deleting Notion task.")
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

# Load environment variables from .env file
load_dotenv()

# --- Environment Variable Validation ---
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
SESSION_SECRET_KEY = os.getenv("SESSION_SECRET_KEY")

if not all([GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, SESSION_SECRET_KEY]):
    raise ValueError("Required environment variables are not set. Please check your .env file.")

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
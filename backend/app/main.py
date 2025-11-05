import os
import datetime
from dotenv import load_dotenv

# This environment variable allows OAuth2 to work with HTTP. Required for local development.
os.environ['OAUTHLIB_INSECURE_TRANSPORT'] = '1'

from fastapi import FastAPI, HTTPException, Request, File, UploadFile
from fastapi.responses import RedirectResponse
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware

import PIL.Image
import io

from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
import httpx
from pydantic import BaseModel
import google.generativeai as genai
import json

# Load environment variables from .env file
load_dotenv()

# --- Environment Variable Validation ---
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
SESSION_SECRET_KEY = os.getenv("SESSION_SECRET_KEY")
NOTION_API_KEY = os.getenv("NOTION_API_KEY")
NOTION_DATABASE_ID = os.getenv("NOTION_DATABASE_ID")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if not all([GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, SESSION_SECRET_KEY]):
    raise ValueError("Google OAuth environment variables are not set. Please check your .env file.")

if not all([NOTION_API_KEY, NOTION_DATABASE_ID]):
    print("Notion environment variables (NOTION_API_KEY, NOTION_DATABASE_ID) are not fully set. Notion integration will be disabled.")
    NOTION_API_KEY = None
    NOTION_DATABASE_ID = None

if not GEMINI_API_KEY:
    print("GEMINI_API_KEY is not set. Gemini integration will be disabled.")
    GEMINI_API_KEY = None
else:
    genai.configure(api_key=GEMINI_API_KEY)

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

# --- Study Log Endpoints ---

STUDY_LOG_DATABASE_ID = os.getenv("STUDY_LOG_DATABASE_ID")

if not STUDY_LOG_DATABASE_ID:
    print("STUDY_LOG_DATABASE_ID is not set. Study log integration will be disabled.")

class CreateStudyLogRequest(BaseModel):
    title: str
    study_time: int
    date: str
    details: Optional[str] = None

@app.post("/api/studylog")
async def create_study_log(request_body: CreateStudyLogRequest):
    if not NOTION_API_KEY or not STUDY_LOG_DATABASE_ID:
        raise HTTPException(status_code=500, detail="Study log integration is not configured.")

    headers = {
        "Authorization": f"Bearer {NOTION_API_KEY}",
        "Content-Type": "application/json",
        "Notion-Version": "2022-06-28",
    }

    url = "https://api.notion.com/v1/pages"

    properties = {
        "内容": {
            "title": [
                {
                    "text": {
                        "content": request_body.title
                    }
                }
            ]
        },
        "学習時間": {
            "number": request_body.study_time
        },
        "日付": {
            "date": {
                "start": request_body.date
            }
        },
    }

    if request_body.details:
        properties["詳細"] = {"rich_text": [{"text": {"content": request_body.details}}]}

    payload = {
        "parent": { "database_id": STUDY_LOG_DATABASE_ID },
        "properties": properties
    }

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(url, headers=headers, json=payload)
            response.raise_for_status()
            return response.json()
    except httpx.HTTPStatusError as e:
        print(f"Error creating study log: {e.response.text}")
        raise HTTPException(status_code=e.response.status_code, detail=f"Failed to create study log: {e.response.text}")
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
        raise HTTPException(status_code=500, detail="An unexpected error occurred while creating study log.")

@app.get("/api/studylog")
async def get_study_logs(date: str):
    if not NOTION_API_KEY or not STUDY_LOG_DATABASE_ID:
        raise HTTPException(status_code=500, detail="Study log integration is not configured.")

    headers = {
        "Authorization": f"Bearer {NOTION_API_KEY}",
        "Content-Type": "application/json",
        "Notion-Version": "2022-06-28",
    }

    url = f"https://api.notion.com/v1/databases/{STUDY_LOG_DATABASE_ID}/query"

    # Filter by date
    filter_payload = {
        "filter": {
            "property": "日付",
            "date": {
                "equals": date
            }
        }
    }

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(url, headers=headers, json=filter_payload)
            response.raise_for_status()
            data = response.json()

        results = data.get("results")
        study_logs = []
        for page in results:
            properties = page.get("properties", {})
            title_property = properties.get("内容", {}).get("title")
            study_time_property = properties.get("学習時間", {}).get("number")
            date_property = properties.get("日付", {}).get("date")
            details_property = properties.get("詳細", {}).get("rich_text")

            title = title_property[0].get("plain_text") if title_property and title_property[0] else None
            study_time = study_time_property if study_time_property is not None else None
            log_date = date_property.get("start") if date_property else None
            details = details_property[0].get("plain_text") if details_property and details_property[0] else None

            study_logs.append({
                "id": page["id"],
                "title": title,
                "study_time": study_time,
                "date": log_date,
                "details": details
            })
        return study_logs

    except httpx.HTTPStatusError as e:
        print(f"Error fetching study logs: {e.response.text}")
        raise HTTPException(status_code=e.response.status_code, detail=f"Failed to fetch study logs: {e.response.text}")
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
        raise HTTPException(status_code=500, detail="An unexpected error occurred while fetching study logs.")

class SummarizeStudyLogRequest(BaseModel):
    study_logs: list[dict]

@app.post("/api/studylog/summarize")
async def summarize_study_log(request_body: SummarizeStudyLogRequest):
    if not GEMINI_API_KEY:
        raise HTTPException(status_code=500, detail="Gemini integration is not configured.")

    if not request_body.study_logs:
        return {"summary": "No study logs provided for summarization.", "model": "gemini-pro"}

    prompt_parts = [
        "以下の学習記録を要約し、今日一日の振り返りとして簡潔にまとめてください。",
        "各学習内容と学習時間を考慮し、特に重要な点や進捗を強調してください。",
        "---学習記録---"
    ]

    for log in request_body.study_logs:
        prompt_parts.append(f"- 学習内容: {log.get("title", "不明")}, 学習時間: {log.get("study_time", 0)}分, 詳細: {log.get("details", "なし")}")
    
    prompt_parts.append("---要約---")

    try:
        model = genai.GenerativeModel('gemini-pro-latest')
        response = model.generate_content("\n".join(prompt_parts))
        return {"summary": response.text, "model": "gemini-pro-latest"}
    except Exception as e:
        print(f"Error summarizing study logs with Gemini API: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to summarize study logs: {e}")

@app.delete("/api/studylog/{log_id}")

async def delete_study_log(log_id: str):

    if not NOTION_API_KEY:

        raise HTTPException(status_code=500, detail="Notion integration is not configured.")



    headers = {

        "Authorization": f"Bearer {NOTION_API_KEY}",

        "Content-Type": "application/json",

        "Notion-Version": "2022-06-28",

    }



    url = f"https://api.notion.com/v1/pages/{log_id}"



    payload = {"archived": True}



    try:

        async with httpx.AsyncClient() as client:

            response = await client.patch(url, headers=headers, json=payload)

            response.raise_for_status()

            return response.json()

    except httpx.HTTPStatusError as e:

        print(f"Error deleting study log: {e.response.text}")

        raise HTTPException(status_code=e.response.status_code, detail=f"Failed to delete study log: {e.response.text}")

    except Exception as e:

        print(f"An unexpected error occurred: {e}")

        raise HTTPException(status_code=500, detail="An unexpected error occurred while deleting study log.")



# --- Accounting Endpoints ---



NOTION_ACCOUNTING_DATABASE_ID = os.getenv("NOTION_ACCOUNTING_DATABASE_ID")



if not NOTION_ACCOUNTING_DATABASE_ID:



    print("NOTION_ACCOUNTING_DATABASE_ID is not set. Accounting integration will be disabled.")







CATEGORIES_FILE = os.path.join(os.path.dirname(__file__), "categories.json")







class AddCategoryRequest(BaseModel):



    category: str







@app.get("/api/accounting/categories")



def get_categories():



    try:



        with open(CATEGORIES_FILE, "r") as f:



            categories = json.load(f)



        return categories



    except FileNotFoundError:



        return []







@app.post("/api/accounting/categories")



async def add_category(request_body: AddCategoryRequest):



    try:



        with open(CATEGORIES_FILE, "r+") as f:



            categories = json.load(f)



            new_category = request_body.category



            if new_category not in categories:



                categories.append(new_category)



                f.seek(0)



                json.dump(categories, f, ensure_ascii=False, indent=2)



                f.truncate()



        return {"message": "Category added successfully"}



    except FileNotFoundError:



        with open(CATEGORIES_FILE, "w") as f:



            json.dump([request_body.category], f, ensure_ascii=False, indent=2)



        return {"message": "Category added successfully"}







class AccountingEntry(BaseModel):



    id: str



    date: str



    entry_type: str



    amount: float



    category: str



    description: str



    classification: str







class CreateAccountingEntryRequest(BaseModel):



    date: str



    entry_type: str



    amount: float



    category: str



    description: str



    classification: str







@app.post("/api/accounting")



async def create_accounting_entry(request_body: CreateAccountingEntryRequest):



    if not NOTION_API_KEY or not NOTION_ACCOUNTING_DATABASE_ID:



        raise HTTPException(status_code=500, detail="Accounting integration is not configured.")







    headers = {



        "Authorization": f"Bearer {NOTION_API_KEY}",



        "Content-Type": "application/json",



        "Notion-Version": "2022-06-28",



    }







    url = "https://api.notion.com/v1/pages"







    properties = {



        "日付": {"date": {"start": request_body.date}},



        "種類": {"select": {"name": request_body.entry_type}},



        "金額": {"number": request_body.amount},



        "カテゴリ": {"select": {"name": request_body.category}},



        "内容": {"title": [{"text": {"content": request_body.description}}]}, 



        "区分": {"select": {"name": request_body.classification}}



    }







    payload = {



        "parent": {"database_id": NOTION_ACCOUNTING_DATABASE_ID},



        "properties": properties



    }







    try:



        async with httpx.AsyncClient() as client:



            response = await client.post(url, headers=headers, json=payload)



            response.raise_for_status()



            return response.json()



    except httpx.HTTPStatusError as e:



        print(f"Error creating accounting entry: {e.response.text}")



        raise HTTPException(status_code=e.response.status_code, detail=f"Failed to create accounting entry: {e.response.text}")



    except Exception as e:



        print(f"An unexpected error occurred: {e}")



        raise HTTPException(status_code=500, detail="An unexpected error occurred while creating accounting entry.")







@app.get("/api/accounting")



async def get_accounting_entries(start_date: Optional[str] = None, end_date: Optional[str] = None):



    if not NOTION_API_KEY or not NOTION_ACCOUNTING_DATABASE_ID:



        raise HTTPException(status_code=500, detail="Accounting integration is not configured.")







    headers = {



        "Authorization": f"Bearer {NOTION_API_KEY}",



        "Content-Type": "application/json",



        "Notion-Version": "2022-06-28",



    }







    url = f"https://api.notion.com/v1/databases/{NOTION_ACCOUNTING_DATABASE_ID}/query"







    filter_payload = {"filter": {"and": []}}



    if start_date:



        filter_payload["filter"]["and"].append({"property": "日付", "date": {"on_or_after": start_date}})



    if end_date:



        filter_payload["filter"]["and"].append({"property": "日付", "date": {"on_or_before": end_date}})







    try:



        async with httpx.AsyncClient() as client:



            response = await client.post(url, headers=headers, json=filter_payload if filter_payload["filter"]["and"] else {})



            response.raise_for_status()



            data = response.json()







        results = data.get("results")



        entries = []



        for page in results:



            properties = page.get("properties", {})



            date_prop = properties.get("日付", {}).get("date", {})



            entry_type_prop = properties.get("種類", {}).get("select", {})



            amount_prop = properties.get("金額", {}).get("number")



            category_prop = properties.get("カテゴリ", {}).get("select", {})



            description_prop = properties.get("内容", {}).get("title")



            classification_prop = properties.get("区分", {}).get("select", {})







            entries.append({



                "id": page["id"],



                "date": date_prop.get("start") if date_prop else None,



                "entry_type": entry_type_prop.get("name") if entry_type_prop else None,



                "amount": amount_prop,



                "category": category_prop.get("name") if category_prop else None,



                "description": description_prop[0].get("plain_text") if description_prop and description_prop[0] else None,



                "classification": classification_prop.get("name") if classification_prop else None,



            })



        return entries







    except httpx.HTTPStatusError as e:



        print(f"Error fetching accounting entries: {e.response.text}")



        raise HTTPException(status_code=e.response.status_code, detail=f"Failed to fetch accounting entries: {e.response.text}")



    except Exception as e:



        print(f"An unexpected error occurred: {e}")



        raise HTTPException(status_code=500, detail="An unexpected error occurred while fetching accounting entries.")



@app.post("/api/accounting/receipt")



async def process_receipt(file: UploadFile = File(...)):



    if not GEMINI_API_KEY:



        raise HTTPException(status_code=500, detail="Gemini integration is not configured.")







    try:



        # Read image content



        contents = await file.read()



        img = PIL.Image.open(io.BytesIO(contents))







        # Send to Gemini



        model = genai.GenerativeModel('gemini-pro-vision')



        prompt = """



        Analyze this receipt image and extract the following information in JSON format:



        - "date": The date of the transaction (in YYYY-MM-DD format).



        - "description": The name of the store or a brief description of the purchase.



        - "amount": The total amount of the transaction as a float.







        If any of this information is not available, set the value to null.



        """



        response = model.generate_content([prompt, img])







        # The response from Gemini might be in a markdown block, so we need to clean it up



        cleaned_text = response.text.strip().replace('```json', '').replace('```', '')



        



        return cleaned_text







    except Exception as e:



        print(f"Error processing receipt: {e}")



        raise HTTPException(status_code=500, detail=f"Failed to process receipt: {e}")







class UpdateAccountingEntryRequest(BaseModel):



    date: Optional[str] = None



    entry_type: Optional[str] = None



    amount: Optional[float] = None



    category: Optional[str] = None



    description: Optional[str] = None



    classification: Optional[str] = None







@app.patch("/api/accounting/{entry_id}")



async def update_accounting_entry(entry_id: str, request_body: UpdateAccountingEntryRequest):



    if not NOTION_API_KEY:



        raise HTTPException(status_code=500, detail="Accounting integration is not configured.")







    headers = {



        "Authorization": f"Bearer {NOTION_API_KEY}",



        "Content-Type": "application/json",



        "Notion-Version": "2022-06-28",



    }







    url = f"https://api.notion.com/v1/pages/{entry_id}"







    properties = {}



    if request_body.date is not None:



        properties["日付"] = {"date": {"start": request_body.date}}



    if request_body.entry_type is not None:



        properties["種類"] = {"select": {"name": request_body.entry_type}}



    if request_body.amount is not None:



        properties["金額"] = {"number": request_body.amount}



    if request_body.category is not None:



        properties["カテゴリ"] = {"select": {"name": request_body.category}}



    if request_body.description is not None:



        properties["内容"] = {"title": [{"text": {"content": request_body.description}}]}



    if request_body.classification is not None:



        properties["区分"] = {"select": {"name": request_body.classification}}







    payload = {"properties": properties}







    try:



        async with httpx.AsyncClient() as client:



            response = await client.patch(url, headers=headers, json=payload)



            response.raise_for_status()



            return response.json()



    except httpx.HTTPStatusError as e:



        print(f"Error updating accounting entry: {e.response.text}")



        raise HTTPException(status_code=e.response.status_code, detail=f"Failed to update accounting entry: {e.response.text}")



    except Exception as e:



        print(f"An unexpected error occurred: {e}")



        raise HTTPException(status_code=500, detail="An unexpected error occurred while updating accounting entry.")







@app.delete("/api/accounting/{entry_id}")



async def delete_accounting_entry(entry_id: str):



    if not NOTION_API_KEY:



        raise HTTPException(status_code=500, detail="Accounting integration is not configured.")







    headers = {



        "Authorization": f"Bearer {NOTION_API_KEY}",



        "Content-Type": "application/json",



        "Notion-Version": "2022-06-28",



    }







    url = f"https://api.notion.com/v1/pages/{entry_id}"







    payload = {"archived": True}







    try:



        async with httpx.AsyncClient() as client:



            response = await client.patch(url, headers=headers, json=payload)



            response.raise_for_status()



            return response.json()



    except httpx.HTTPStatusError as e:



        print(f"Error deleting accounting entry: {e.response.text}")



        raise HTTPException(status_code=e.response.status_code, detail=f"Failed to delete accounting entry: {e.response.text}")



    except Exception as e:



        print(f"An unexpected error occurred: {e}")



        raise HTTPException(status_code=500, detail="An unexpected error occurred while deleting accounting entry.")





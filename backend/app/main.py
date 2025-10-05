from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime, date
from typing import List, Optional

app = FastAPI()

# CORS設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class Todo(BaseModel):
    id: int
    title: str
    created_at: date
    due_date: Optional[date] = None
    completed: bool = False


class TodoCreate(BaseModel):
    title: str
    due_date: Optional[date] = None


# --- 仮のデータ保存場所（今はメモリ上） ---
todos: List[Todo] = []
next_id = 1


@app.post("/todos/", response_model=List[Todo])
def create_todo(data: TodoCreate):
    global next_id

    if data.title.strip() == "":
        raise HTTPException(status_code=400, detail="Title cannot be empty")

    # todoオブジェクトの作成
    new_todo = Todo(
        id=next_id,
        title=data.title,
        created_at=datetime.utcnow().date(),
        due_date=data.due_date,
    )

    todos.append(new_todo)

    next_id += 1

    return todos

import { useState, useEffect } from "react";
import "./MorningRoutine.css"; // Import the CSS file

interface Routine {
  id: number;
  text: string;
  done: boolean;
}

const initialRoutines: Routine[] = [
  { id: 1, text: "ベッドを整える", done: false },
  { id: 2, text: "コップ1杯の水を飲む", done: false },
  { id: 3, text: "瞑想する", done: false },
  { id: 4, text: "今日の計画を立てる", done: false },
];

const LOCAL_STORAGE_KEY = "morningRoutines";

// Helper to get date in YYYY-MM-DD format
const getTodayString = () => new Date().toISOString().split("T")[0];

export const MorningRoutine = () => {
  const [routines, setRoutines] = useState<Routine[]>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!saved) return initialRoutines;

    const { date, routines: savedRoutines } = JSON.parse(saved);
    const today = getTodayString();

    if (date !== today) {
      return (savedRoutines as Routine[]).map((r) => ({ ...r, done: false }));
    }
    return savedRoutines;
  });

  const [newRoutineText, setNewRoutineText] = useState("");

  useEffect(() => {
    const stateToSave = {
      date: getTodayString(),
      routines: routines,
    };
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(stateToSave));
  }, [routines]);

  const handleToggle = (id: number) => {
    setRoutines(
      routines.map((routine) =>
        routine.id === id ? { ...routine, done: !routine.done } : routine,
      ),
    );
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault(); // Prevent form submission from reloading the page
    if (newRoutineText.trim() === "") return;
    const newItem: Routine = {
      id: Date.now(),
      text: newRoutineText.trim(),
      done: false,
    };
    setRoutines([...routines, newItem]);
    setNewRoutineText("");
  };

  const handleDeleteItem = (id: number) => {
    setRoutines(routines.filter((routine) => routine.id !== id));
  };

  return (
    <div className="routine-widget">
      <h3>朝のルーティン</h3>
      <ul className="routine-list">
        {routines.map((routine) => (
          <li key={routine.id} className="routine-item">
            <label
              style={{ textDecoration: routine.done ? "line-through" : "none" }}
            >
              <input
                type="checkbox"
                checked={routine.done}
                onChange={() => handleToggle(routine.id)}
              />
              {routine.text}
            </label>
            <button
              onClick={() => handleDeleteItem(routine.id)}
              className="delete-btn"
            >
              ×
            </button>
          </li>
        ))}
      </ul>
      <form onSubmit={handleAddItem} className="add-item-form">
        <input
          type="text"
          value={newRoutineText}
          onChange={(e) => setNewRoutineText(e.target.value)}
          placeholder="新しいルーティンを追加"
        />
        <button type="submit">追加</button>
      </form>
    </div>
  );
};

import { useState, useEffect } from "react";
import "./GoogleCalendar.css";

interface CalendarEvent {
  summary: string;
  start: string;
}

// Helper to format a date object to a YYYY-MM-DD string
const toYYYYMMDD = (date: Date) => {
  return date.toISOString().split("T")[0];
};

export const GoogleCalendar = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [targetDate, setTargetDate] = useState(new Date()); // Date to display
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check authentication status on component mount
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const response = await fetch("http://localhost:8000/api/auth/status", {
          credentials: "include",
        });
        const data = await response.json();
        setIsAuthenticated(data.authenticated);
      } catch {
        setError("認証状態の確認に失敗しました。");
      } finally {
        setLoading(false);
      }
    };
    checkAuthStatus();
  }, []);

  // Fetch events when authenticated or when targetDate changes
  useEffect(() => {
    if (isAuthenticated) {
      const fetchEvents = async () => {
        try {
          setLoading(true);
          const dateStr = toYYYYMMDD(targetDate);
          const response = await fetch(
            `http://localhost:8000/api/google-calendar/events?date=${dateStr}`,
            { credentials: "include" },
          );
          if (!response.ok) {
            throw new Error("Failed to fetch events");
          }
          const data = await response.json();
          setEvents(data);
        } catch {
          setError("カレンダーの予定取得に失敗しました。");
        } finally {
          setLoading(false);
        }
      };
      fetchEvents();
    }
  }, [isAuthenticated, targetDate]);

  const handleLogin = () => {
    window.location.href = "http://localhost:8000/auth/google";
  };

  const handleLogout = async () => {
    await fetch("http://localhost:8000/api/auth/logout", {
      credentials: "include",
    });
    setIsAuthenticated(false);
    setEvents([]);
  };

  const changeDate = (days: number) => {
    setTargetDate((prevDate) => {
      const newDate = new Date(prevDate);
      newDate.setDate(newDate.getDate() + days);
      return newDate;
    });
  };

  const formattedDate = new Date(targetDate).toLocaleDateString("ja-JP", {
    month: "long",
    day: "numeric",
    weekday: "short",
  });

  if (!isAuthenticated) {
    return (
      <div className="gcal-widget">
        <h3>カレンダー</h3>
        <button onClick={handleLogin}>Googleカレンダーと連携</button>
        {error && <p className="error">{error}</p>}
      </div>
    );
  }

  return (
    <div className="gcal-widget">
      <div className="gcal-header">
        <button onClick={() => changeDate(-1)} className="nav-btn">
          &lt;
        </button>
        <h3>{formattedDate}</h3>
        <button onClick={() => changeDate(1)} className="nav-btn">
          &gt;
        </button>
        <button onClick={handleLogout} className="logout-btn">
          ログアウト
        </button>
      </div>
      {loading && <p>予定を読み込み中...</p>}
      {error && <p className="error">{error}</p>}
      {!loading && !error && events.length === 0 && <p>予定はありません。</p>}
      {!loading && !error && events.length > 0 && (
        <ul className="event-list">
          {events.map((event, index) => {
            const isAllDay = !event.start.includes("T");
            const eventDate = new Date(event.start);
            const time = isAllDay
              ? "終日"
              : eventDate.toLocaleTimeString("ja-JP", {
                  hour: "2-digit",
                  minute: "2-digit",
                });

            return (
              <li
                key={index}
                className={`event-item ${isAllDay ? "is-allday" : ""}`}
              >
                <div className="event-time-container">{time}</div>
                <div className="event-details">
                  <span className="event-summary">{event.summary}</span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

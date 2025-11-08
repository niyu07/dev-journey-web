import React, { useState, useEffect } from "react";
import "./StudyLog.css";

interface StudyLogEntry {
  id: string;
  title: string;
  study_time: number;
  date: string;
  details: string | null;
}

const StudyLog: React.FC = () => {
  const [studyLogs, setStudyLogs] = useState<StudyLogEntry[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedLogs, setSelectedLogs] = useState<Set<string>>(new Set());
  const [summary, setSummary] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [title, setTitle] = useState("");
  const [studyTime, setStudyTime] = useState("");
  const [details, setDetails] = useState("");

  const formatDate = (date: Date) => {
    return date.toISOString().split("T")[0];
  };

  const fetchStudyLogs = React.useCallback(async (date: Date) => {
    setError(null);
    try {
      const formattedDate = formatDate(date);
      const response = await fetch(
        `http://localhost:8000/api/studylog?date=${formattedDate}`,
      );
      if (!response.ok) {
        throw new Error("Failed to fetch study logs");
      }
      const data = await response.json();
      setStudyLogs(data);
      setSelectedLogs(new Set()); // Reset selection when date changes
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unknown error occurred while fetching study logs");
      }
    }
  }, []);

  useEffect(() => {
    fetchStudyLogs(selectedDate);
  }, [selectedDate, fetchStudyLogs]);

  const handleAddLog = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const response = await fetch("http://localhost:8000/api/studylog", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          study_time: parseInt(studyTime),
          date: formatDate(selectedDate),
          details,
        }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to add study log");
      }
      setTitle("");
      setStudyTime("");
      setDetails("");
      fetchStudyLogs(selectedDate); // Refresh logs
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unknown error occurred while adding study log");
      }
    }
  };

  const handleSummarizeDay = async () => {
    setError(null);
    setSummary(null);
    const logsToSummarize = studyLogs.filter((log) => selectedLogs.has(log.id));
    if (logsToSummarize.length === 0) {
      setError("Please select at least one log to summarize.");
      return;
    }

    try {
      const response = await fetch(
        "http://localhost:8000/api/studylog/summarize",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ study_logs: logsToSummarize }),
        },
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to summarize day");
      }
      const data = await response.json();
      setSummary(data.summary);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unknown error occurred while summarizing day");
      }
    }
  };

  const handleLogSelection = (logId: string) => {
    const newSelection = new Set(selectedLogs);
    if (newSelection.has(logId)) {
      newSelection.delete(logId);
    } else {
      newSelection.add(logId);
    }
    setSelectedLogs(newSelection);
  };

  const handleDeleteLog = async (logId: string) => {
    if (window.confirm("Are you sure you want to delete this log?")) {
      try {
        const response = await fetch(
          `http://localhost:8000/api/studylog/${logId}`,
          {
            method: "DELETE",
          },
        );
        if (!response.ok) {
          throw new Error("Failed to delete study log");
        }
        fetchStudyLogs(selectedDate); // Refresh logs
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("An unknown error occurred while deleting study log");
        }
      }
    }
  };

  const goToPreviousDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(selectedDate.getDate() - 1);
    setSelectedDate(newDate);
  };

  const goToNextDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(selectedDate.getDate() + 1);
    setSelectedDate(newDate);
  };

  return (
    <div className="study-log-container">
      <div className="study-log-header">
        <h2>Study Log</h2>
        <div className="date-selector">
          <button onClick={goToPreviousDay}>&lt;</button>
          <span>{selectedDate.toLocaleDateString()}</span>
          <button onClick={goToNextDay}>&gt;</button>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="study-log-body">
        <div className="study-log-form-section">
          <h3>Add New Log</h3>
          <form onSubmit={handleAddLog} className="add-log-form">
            <div className="form-group">
              <label>内容</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>学習時間（分）</label>
              <input
                type="number"
                value={studyTime}
                onChange={(e) => setStudyTime(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>詳細</label>
              <textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                rows={3}
              ></textarea>
            </div>
            <button type="submit">Add Log</button>
          </form>
        </div>

        <div className="study-log-display-section">
          <h3>Logs for {selectedDate.toLocaleDateString()}</h3>
          {studyLogs.length === 0 ? (
            <p>No logs for this day.</p>
          ) : (
            <ul>
              {studyLogs.map((log) => (
                <li key={log.id} className="study-log-item">
                  <input
                    type="checkbox"
                    checked={selectedLogs.has(log.id)}
                    onChange={() => handleLogSelection(log.id)}
                  />
                  <div className="log-content">
                    <h4>
                      {log.title} ({log.study_time}分)
                    </h4>
                    {log.details && <p>{log.details}</p>}
                  </div>
                  <button
                    onClick={() => handleDeleteLog(log.id)}
                    className="delete-log-btn"
                  >
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          )}

          <button
            onClick={handleSummarizeDay}
            disabled={selectedLogs.size === 0}
          >
            Summarize Selected
          </button>
          {summary && (
            <div className="summary-output">
              <h3>Today's Summary</h3>
              <p>{summary}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudyLog;

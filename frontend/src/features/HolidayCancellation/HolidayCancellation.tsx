import React, { useState, useMemo } from "react";
import "./HolidayCancellation.css";

interface Candidate {
  id: string;
  summary: string;
  date: string;
  holiday_name?: string;
}

const HolidayCancellation: React.FC = () => {
  const [searchDuration, setSearchDuration] = useState(1); // in months
  const [allCandidates, setAllCandidates] = useState<Candidate[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filterKeyword, setFilterKeyword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const findCandidates = async () => {
    setIsLoading(true);
    setMessage(null);
    setAllCandidates([]);
    setSelectedIds(new Set());
    setFilterKeyword("");
    try {
      const startDate = new Date();
      const endDate = new Date();
      endDate.setMonth(startDate.getMonth() + searchDuration);

      const startDateStr = startDate.toISOString().split("T")[0];
      const endDateStr = endDate.toISOString().split("T")[0];

      const response = await fetch(
        `/api/google-calendar/cancellation-candidates?start_date=${startDateStr}&end_date=${endDateStr}`,
      );

      if (!response.ok) {
        let errorDetail = `Error: ${response.status} ${response.statusText}`;
        try {
          const errorData = await response.json();
          errorDetail = errorData.detail || JSON.stringify(errorData);
        } catch {
          // Response was not JSON, do nothing and use the status text
        }
        throw new Error(errorDetail);
      }

      const data: Candidate[] = await response.json();
      setAllCandidates(data);
      if (data.length === 0) {
        setMessage(
          `No recurring events found on public holidays in the next ${searchDuration} month(s).`,
        );
      }
    } catch (err) {
      setMessage(
        err instanceof Error ? err.message : "An unknown error occurred",
      );
    }
    setIsLoading(false);
  };

  const filteredCandidates = useMemo(() => {
    if (!filterKeyword) {
      return allCandidates;
    }
    return allCandidates.filter(
      (c) =>
        c.summary.toLowerCase().includes(filterKeyword.toLowerCase()) ||
        (c.holiday_name &&
          c.holiday_name.toLowerCase().includes(filterKeyword.toLowerCase())),
    );
  }, [allCandidates, filterKeyword]);

  const handleCheckboxChange = (eventId: string, checked: boolean) => {
    const newSelectedIds = new Set(selectedIds);
    if (checked) {
      newSelectedIds.add(eventId);
    } else {
      newSelectedIds.delete(eventId);
    }
    setSelectedIds(newSelectedIds);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredCandidates.length) {
      const newSelectedIds = new Set(selectedIds);
      filteredCandidates.forEach((c) => newSelectedIds.delete(c.id));
      setSelectedIds(newSelectedIds);
    } else {
      const newSelectedIds = new Set(selectedIds);
      filteredCandidates.forEach((c) => newSelectedIds.add(c.id));
      setSelectedIds(newSelectedIds);
    }
  };

  const handleBatchDelete = async () => {
    setIsLoading(true);
    setMessage(null);
    try {
      const event_ids = Array.from(selectedIds);
      const response = await fetch("/api/google-calendar/batch-delete-events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event_ids }),
      });
      if (!response.ok) {
        let errorDetail = `Error: ${response.status} ${response.statusText}`;
        try {
          const errorData = await response.json();
          errorDetail = errorData.detail || JSON.stringify(errorData);
        } catch {
          // Response was not JSON
        }
        throw new Error(errorDetail);
      }
      const result = await response.json();
      setMessage(result.message);
      // Clear the list after deletion
      setAllCandidates([]);
      setSelectedIds(new Set());
    } catch (err) {
      setMessage(
        err instanceof Error ? err.message : "An unknown error occurred",
      );
    }
    setIsLoading(false);
  };

  return (
    <div className="cancellation-widget">
      <div className="widget-header">
        <h3>Holiday Event Cancellation</h3>
      </div>
      <div className="widget-body">
        <p>
          Cancel recurring events that fall on public holidays within a selected
          period from today.
        </p>
        <div className="controls-area">
          <label htmlFor="duration-select">Search Period:</label>
          <select
            id="duration-select"
            value={searchDuration}
            onChange={(e) => setSearchDuration(Number(e.target.value))}
          >
            <option value={1}>Next 1 Month</option>
            <option value={2}>Next 2 Months</option>
            <option value={3}>Next 3 Months</option>
            <option value={6}>Next 6 Months</option>
          </select>
          <button
            onClick={findCandidates}
            disabled={isLoading}
            className="check-button"
          >
            {isLoading ? "Checking..." : "Check for Events"}
          </button>
        </div>

        {message && <p className="message-area">{message}</p>}

        {allCandidates.length > 0 && (
          <div className="candidates-list">
            <div className="filter-and-actions">
              <input
                type="text"
                placeholder="Filter by keyword..."
                value={filterKeyword}
                onChange={(e) => setFilterKeyword(e.target.value)}
                className="filter-input"
              />
              <button onClick={toggleSelectAll} className="select-all-btn">
                {selectedIds.size === filteredCandidates.length
                  ? "Deselect All"
                  : "Select All"}
              </button>
            </div>

            <div className="events-found-count">
              Found {filteredCandidates.length} matching event(s):
            </div>
            <ul className="events-list">
              {filteredCandidates.map((c) => (
                <li key={c.id}>
                  <label>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(c.id)}
                      onChange={(e) =>
                        handleCheckboxChange(c.id, e.target.checked)
                      }
                    />
                    <span className="event-holiday">【{c.holiday_name}】</span>
                    <span className="event-date">{c.date}</span>:{c.summary}
                  </label>
                </li>
              ))}
            </ul>
            <button
              onClick={handleBatchDelete}
              disabled={isLoading || selectedIds.size === 0}
              className="cancel-button"
            >
              {isLoading
                ? "Cancelling..."
                : `Cancel ${selectedIds.size} Selected Event(s)`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default HolidayCancellation;

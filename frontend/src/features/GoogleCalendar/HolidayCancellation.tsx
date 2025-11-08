import React, { useState, useMemo } from "react";

interface Candidate {
  id: string;
  summary: string;
  date: string;
}

interface HolidayCancellationProps {
  year: number;
  month: number;
}

const HolidayCancellation: React.FC<HolidayCancellationProps> = ({
  year,
  month,
}) => {
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
      const response = await fetch(
        `/api/google-calendar/cancellation-candidates?year=${year}&month=${month}`,
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to find candidates");
      }
      const data: Candidate[] = await response.json();
      setAllCandidates(data);
      if (data.length === 0) {
        setMessage(
          "No recurring events found on public holidays for this month.",
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
    return allCandidates.filter((c) =>
      c.summary.toLowerCase().includes(filterKeyword.toLowerCase()),
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
      // Deselect all visible
      const newSelectedIds = new Set(selectedIds);
      filteredCandidates.forEach((c) => newSelectedIds.delete(c.id));
      setSelectedIds(newSelectedIds);
    } else {
      // Select all visible
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
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to delete events");
      }
      const result = await response.json();
      setMessage(result.message);
      // Refetch to clear the list
      findCandidates();
    } catch (err) {
      setMessage(
        err instanceof Error ? err.message : "An unknown error occurred",
      );
    }
    setIsLoading(false);
  };

  return (
    <div className="holiday-cancellation-container">
      <h4>Holiday Recurring Event Cancellation</h4>
      <p>
        Find and cancel recurring events that fall on public holidays for the
        selected month.
      </p>
      <button onClick={findCandidates} disabled={isLoading}>
        {isLoading ? "Checking..." : "Check for Recurring Events on Holidays"}
      </button>

      {message && <p className="cancellation-message">{message}</p>}

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
            <button onClick={toggleSelectAll}>
              {selectedIds.size === filteredCandidates.length
                ? "Deselect All"
                : "Select All"}
            </button>
          </div>

          <h5>
            Found {filteredCandidates.length} matching recurring event(s):
          </h5>
          <ul>
            {filteredCandidates.map((c) => (
              <li key={c.id}>
                <input
                  type="checkbox"
                  checked={selectedIds.has(c.id)}
                  onChange={(e) => handleCheckboxChange(c.id, e.target.checked)}
                />
                {c.date}: {c.summary}
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
  );
};

export default HolidayCancellation;

import React, { useState, useEffect } from "react";
import "./GitHubActivity.css";
import MonthlyCalendar from "./MonthlyCalendar";

interface ContributionDay {
  contributionCount: number;
  date: string;
  color: string;
}

interface Week {
  contributionDays: ContributionDay[];
}

interface ContributionCalendar {
  totalContributions: number;
  weeks: Week[];
}

const GitHubActivity: React.FC = () => {
  const [yearCalendar, setYearCalendar] = useState<ContributionCalendar | null>(
    null,
  );
  const [monthCalendar, setMonthCalendar] =
    useState<ContributionCalendar | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [error, setError] = useState<string | null>(null);
  const [monthError, setMonthError] = useState<string | null>(null);
  const [isLoadingMonthly, setIsLoadingMonthly] = useState(false);

  // Fetch yearly data on mount
  useEffect(() => {
    const fetchGitHubYearlyActivity = async () => {
      try {
        const response = await fetch(
          "http://localhost:8000/api/github/activity",
        );
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data: ContributionCalendar = await response.json();
        setYearCalendar(data);
      } catch (e) {
        if (e instanceof Error) {
          setError(e.message);
        }
      }
    };

    fetchGitHubYearlyActivity();
  }, []);

  const fetchMonthlyActivity = async () => {
    setMonthError(null);
    setMonthCalendar(null);
    setIsLoadingMonthly(true);

    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const from_date = new Date(year, month, 1).toISOString();
    // Get the last day of the month correctly
    const to_date = new Date(year, month + 1, 0, 23, 59, 59).toISOString();

    try {
      const response = await fetch(
        `http://localhost:8000/api/github/activity?from_date=${from_date}&to_date=${to_date}`,
      );
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data: ContributionCalendar = await response.json();
      setMonthCalendar(data);
    } catch (e) {
      if (e instanceof Error) {
        setMonthError(e.message);
      }
    } finally {
      setIsLoadingMonthly(false);
    }
  };

  const handleDateChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = event.target;
    const newDate = new Date(selectedDate);
    if (name === "year") {
      newDate.setFullYear(parseInt(value, 10));
    }
    if (name === "month") {
      newDate.setMonth(parseInt(value, 10));
    }
    setSelectedDate(newDate);
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);
  const months = Array.from({ length: 12 }, (_, i) => i);

  return (
    <div className="github-activity-container">
      <h2>GitHub Contribution Graph (Last Year)</h2>
      {error && (
        <p className="error">Error fetching GitHub activity: {error}</p>
      )}
      {yearCalendar ? (
        <div>
          <p>
            {yearCalendar.totalContributions} contributions in the last year
          </p>
          <div className="calendar-grid year-grid">
            {yearCalendar.weeks.map((week, weekIndex) => (
              <div key={weekIndex} className="calendar-week">
                {week.contributionDays.map((day) => (
                  <div
                    key={day.date}
                    className="calendar-day"
                    style={{ backgroundColor: day.color }}
                    title={`${day.contributionCount} contributions on ${day.date}`}
                  ></div>
                ))}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p>Loading yearly activity...</p>
      )}

      <hr />

      <h2>Monthly Activity</h2>
      <div className="month-selector">
        <select
          name="year"
          value={selectedDate.getFullYear()}
          onChange={handleDateChange}
        >
          {years.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
        <select
          name="month"
          value={selectedDate.getMonth()}
          onChange={handleDateChange}
        >
          {months.map((month) => (
            <option key={month} value={month}>
              {new Date(0, month).toLocaleString("default", { month: "long" })}
            </option>
          ))}
        </select>
        <button onClick={fetchMonthlyActivity} disabled={isLoadingMonthly}>
          {isLoadingMonthly ? "Loading..." : "Get Monthly Activity"}
        </button>
      </div>

      {monthError && (
        <p className="error">Error fetching monthly activity: {monthError}</p>
      )}
      {monthCalendar && monthCalendar.weeks && (
        <div className="monthly-calendar-container">
          <p>
            {monthCalendar.totalContributions} contributions in{" "}
            {selectedDate.toLocaleString("default", {
              month: "long",
              year: "numeric",
            })}
          </p>
          <MonthlyCalendar
            weeks={monthCalendar.weeks}
            selectedDate={selectedDate}
          />
        </div>
      )}
    </div>
  );
};

export default GitHubActivity;

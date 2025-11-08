import React from 'react';
import './MonthlyCalendar.css';

interface ContributionDay {
  contributionCount: number;
  date: string;
  color: string;
}

interface Week {
  contributionDays: ContributionDay[];
}

interface MonthlyCalendarProps {
  weeks: Week[];
  selectedDate: Date;
}

const MonthlyCalendar: React.FC<MonthlyCalendarProps> = ({ weeks, selectedDate }) => {
  const year = selectedDate.getFullYear();
  const month = selectedDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const allDays = weeks.flatMap(week => week.contributionDays);

  const blanks = Array(firstDayOfMonth).fill(null);
  const monthDays = Array.from({ length: daysInMonth }, (_, i) => {
    const date = new Date(year, month, i + 1);
    const dateString = date.toISOString().split('T')[0];
    return allDays.find(day => day.date === dateString) || { date: dateString, contributionCount: 0, color: '#ebedf0' };
  });

  const totalCells = [...blanks, ...monthDays];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="monthly-calendar">
      <div className="calendar-header">
        {dayNames.map(day => <div key={day} className="day-name">{day}</div>)}
      </div>
      <div className="calendar-body">
        {totalCells.map((day, index) => {
          if (!day) {
            return <div key={`blank-${index}`} className="day-cell empty"></div>;
          }
          return (
            <div key={day.date} className="day-cell" style={{ backgroundColor: day.color }}>
              <div className="day-number">{new Date(day.date).getDate()}</div>
              <div className="contribution-count">{day.contributionCount}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MonthlyCalendar;

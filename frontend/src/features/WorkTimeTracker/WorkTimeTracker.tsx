import React, { useState, useEffect, useRef } from 'react';
import './WorkTimeTracker.css';

interface WorkTimeTrackerProps {
  onLogSubmit: (title: string, minutes: number, details: string) => Promise<void>;
}

const workOptions = [
  '学校',
  '開発',
  '業務委託',
  'Other'
];

const WorkTimeTracker: React.FC<WorkTimeTrackerProps> = ({ onLogSubmit }) => {
  const [selectedWork, setSelectedWork] = useState(workOptions[0]);
  const [customTitle, setCustomTitle] = useState('');
  const [isActive, setIsActive] = useState(false);
  const [time, setTime] = useState(0);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (isActive) {
      setStartTime(new Date());
      intervalRef.current = window.setInterval(() => {
        setTime(prevTime => prevTime + 1);
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isActive]);

  const handleStartStop = () => {
    setIsActive(!isActive);
  };

  const handleReset = () => {
    setIsActive(false);
    setTime(0);
    setSelectedWork(workOptions[0]);
    setCustomTitle('');
  };

  const handleSave = async () => {
    const titleToSave = selectedWork === 'Other' ? customTitle : selectedWork;

    if (time === 0) {
      alert('No time has been tracked.');
      return;
    }
    if (!titleToSave) {
      alert('Please enter a title for your work session.');
      return;
    }

    const minutes = Math.floor(time / 60);
    const details = `Tracked from ${startTime?.toLocaleTimeString()} to ${new Date().toLocaleTimeString()}`;

    try {
      await onLogSubmit(titleToSave, minutes, details);
      alert('Work session saved to Study Log!');
      handleReset();
    } catch (error) {
      alert('Failed to save work session.');
      console.error(error);
    }
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  return (
    <div className="work-time-tracker-container">
      <h2>Work Time Tracker</h2>
      <div className="tracker-time-display">{formatTime(time)}</div>
      <div className="tracker-controls">
        <select 
          value={selectedWork} 
          onChange={(e) => setSelectedWork(e.target.value)} 
          className="tracker-title-input"
          disabled={isActive}
        >
          {workOptions.map(option => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
        {selectedWork === 'Other' && (
          <input 
            type="text" 
            value={customTitle} 
            onChange={(e) => setCustomTitle(e.target.value)} 
            placeholder="Enter custom title"
            className="tracker-title-input"
            disabled={isActive}
          />
        )}
        <button onClick={handleStartStop} className={`tracker-button ${isActive ? 'stop' : 'start'}`}>
          {isActive ? 'Stop' : 'Start'}
        </button>
        <button onClick={handleReset} className="tracker-button reset">Reset</button>
        <button onClick={handleSave} className="tracker-button save" disabled={isActive || time === 0}>
          Save to Study Log
        </button>
      </div>
    </div>
  );
};

export default WorkTimeTracker;

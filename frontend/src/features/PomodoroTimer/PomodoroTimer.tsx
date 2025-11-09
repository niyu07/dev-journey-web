import React, { useState, useEffect, useRef } from "react";

type Mode = keyof typeof initialModes;

const POMODORO_STORAGE_KEY = "pomodoroSettings";

const initialModes = {
  pomodoro: {
    name: "作業",
    time: 25,
  },
  shortBreak: {
    name: "短い休憩",
    time: 5,
  },
  longBreak: {
    name: "長い休憩",
    time: 15,
  },
};

export const PomodoroTimer = () => {
  const [modes, setModes] = useState(() => {
    const saved = localStorage.getItem(POMODORO_STORAGE_KEY);
    return saved ? JSON.parse(saved) : initialModes;
  });

  const [mode, setMode] = useState<Mode>("pomodoro");
  const [timeRemaining, setTimeRemaining] = useState(modes.pomodoro.time * 60);
  const [isActive, setIsActive] = useState(false);
  const intervalRef = useRef<number | null>(null);

  // Save settings to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(POMODORO_STORAGE_KEY, JSON.stringify(modes));
  }, [modes]);

  const switchMode = React.useCallback(
    (newMode: Mode) => {
      setIsActive(false);
      setMode(newMode);
      setTimeRemaining(modes[newMode].time * 60);
    },
    [modes],
  );

  useEffect(() => {
    if (isActive) {
      intervalRef.current = setInterval(() => {
        setTimeRemaining((prev) => prev - 1);
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isActive]);

  useEffect(() => {
    if (timeRemaining < 0) {
      // Changed from === 0 to < 0 to prevent issues
      setIsActive(false);
      // Auto-switch to the next mode
      const nextMode = mode === "pomodoro" ? "shortBreak" : "pomodoro";
      switchMode(nextMode);
    }
  }, [timeRemaining, mode, switchMode]);

  const handleStartPause = () => {
    setIsActive(!isActive);
  };

  const handleReset = () => {
    setIsActive(false);
    setTimeRemaining(modes[mode].time * 60);
  };

  const handleSetPresetTime = (minutes: number) => {
    setIsActive(false);
    setTimeRemaining(minutes * 60);
  };

  const handleTimeChange = (newMode: Mode, newTime: number) => {
    if (newTime > 0 && newTime <= 180) {
      // Limit time to a reasonable range
      const newModes = {
        ...modes,
        [newMode]: { ...modes[newMode], time: newTime },
      };
      setModes(newModes);
      // If the currently active mode's time is changed, update the timer
      if (mode === newMode) {
        setIsActive(false);
        setTimeRemaining(newTime * 60);
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0");
    const secs = (seconds % 60).toString().padStart(2, "0");
    return `${mins}:${secs}`;
  };

  const presetTimes = [5, 10, 15, 30];

  return (
    <div>
      <div>
        {Object.keys(modes).map((key) => {
          const modeKey = key as Mode;
          return (
            <div key={key} style={{ margin: "5px" }}>
              <button
                onClick={() => switchMode(modeKey)}
                disabled={mode === modeKey}
              >
                {modes[modeKey].name}
              </button>
              <input
                type="number"
                value={modes[modeKey].time}
                onChange={(e) =>
                  handleTimeChange(modeKey, parseInt(e.target.value, 10))
                }
                style={{ width: "50px", marginLeft: "10px" }}
              />
              <span>分</span>
            </div>
          );
        })}
      </div>
      <div>
        <h1>{formatTime(timeRemaining)}</h1>
      </div>
      <div style={{ margin: "10px 0" }}>
        {presetTimes.map((time) => (
          <button
            key={time}
            onClick={() => handleSetPresetTime(time)}
            style={{ marginRight: "5px" }}
          >
            {time}分
          </button>
        ))}
      </div>
      <div>
        <button onClick={handleStartPause}>
          {isActive ? "一時停止" : "スタート"}
        </button>
        <button onClick={handleReset}>リセット</button>
      </div>
    </div>
  );
};

import { useState, useEffect } from "react";

const formatDate = (date: Date) => {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const dayOfWeek = ["日", "月", "火", "水", "木", "金", "土"][date.getDay()];
  return `${year}年${month}月${day}日 (${dayOfWeek})`;
};

const formatTime = (date: Date) => {
  return date.toLocaleTimeString("ja-JP", { hour12: false });
};

export const Clock = () => {
  const [date, setDate] = useState(new Date());

  useEffect(() => {
    const timerId = setInterval(() => {
      setDate(new Date());
    }, 1000);

    return () => {
      clearInterval(timerId);
    };
  }, []);

  return (
    <div>
      <h1>{formatTime(date)}</h1>
      <p>{formatDate(date)}</p>
    </div>
  );
};

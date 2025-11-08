import { Clock } from "./features/Clock/Clock";
import { Weather } from "./features/Weather/Weather";
import { MorningRoutine } from "./features/MorningRoutine/MorningRoutine";
import { GoogleCalendar } from "./features/GoogleCalendar/GoogleCalendar";
import HolidayCancellation from "./features/HolidayCancellation/HolidayCancellation";
import { PomodoroTimer } from "./features/PomodoroTimer/PomodoroTimer";
import NotionTasks from "./features/NotionTasks/NotionTasks";
import StudyLog from "./features/StudyLog/StudyLog";
import WorkTimeTracker from "./features/WorkTimeTracker/WorkTimeTracker";
import Accounting from "./features/Accounting/Accounting";
import GitHubActivity from "./features/GitHubActivity/GitHubActivity";
import "./App.css";

function App() {
  const handleLogSubmit = async (
    title: string,
    minutes: number,
    details: string,
  ) => {
    try {
      const response = await fetch("http://localhost:8000/api/studylog", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          study_time: minutes,
          date: new Date().toISOString().split("T")[0],
          details,
        }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to add study log");
      }
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  return (
    <div className="container">
      <Clock />
      <Weather />
      <MorningRoutine />
      <GoogleCalendar />
      <HolidayCancellation />
      <PomodoroTimer />
      <NotionTasks />
      <StudyLog />
      <WorkTimeTracker onLogSubmit={handleLogSubmit} />
      <Accounting />
      <GitHubActivity />
    </div>
  );
}

export default App;

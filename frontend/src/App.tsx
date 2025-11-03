import { Clock } from './features/Clock/Clock';
import { Weather } from './features/Weather/Weather';
import { MorningRoutine } from './features/MorningRoutine/MorningRoutine';
import { GoogleCalendar } from './features/GoogleCalendar/GoogleCalendar';
import { PomodoroTimer } from './features/PomodoroTimer/PomodoroTimer';
import NotionTasks from './features/NotionTasks/NotionTasks';
import StudyLog from './features/StudyLog/StudyLog';
import './App.css';

function App() {
  return (
    <div className="container">
      <Clock />
      <Weather />
      <MorningRoutine />
      <GoogleCalendar />
      <PomodoroTimer />
      <NotionTasks />
      <StudyLog />
    </div>
  );
}

export default App;
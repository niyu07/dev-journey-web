import { Clock } from './features/Clock/Clock';
import { Weather } from './features/Weather/Weather';
import { MorningRoutine } from './features/MorningRoutine/MorningRoutine';
import { GoogleCalendar } from './features/GoogleCalendar/GoogleCalendar';
import './App.css';

function App() {
  return (
    <div className="container">
      <Clock />
      <Weather />
      <MorningRoutine />
      <GoogleCalendar />
    </div>
  );
}

export default App;


import { Clock } from './features/Clock/Clock';
import { Weather } from './features/Weather/Weather';
import './App.css';

function App() {
  return (
    <div className="container">
      <Clock />
      <Weather />
    </div>
  );
}

export default App;


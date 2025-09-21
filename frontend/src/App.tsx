import { useEffect, useState } from "react";
import "./App.css";

function App() {
  const [message, setMessage] = useState<string>("Loading...");

  useEffect(() => {
    fetch("http://localhost:8000/api/hello")
      .then((res) => res.json())
      .then((data) => setMessage(data.message))
      .catch((err) => setMessage("Error: " + err));
  }, []);

  return (
    <div>
      <h1>Frontend + Backend</h1>
      <p>{message}</p>
    </div>
  );
}

export default App;

import { useState, useEffect, useCallback } from "react";

interface WeatherData {
  city: string;
  description: string;
  temperature: number;
  icon: string;
}

const majorCities = {
  東京: { lat: 35.6895, lon: 139.6917 },
  大阪: { lat: 34.6937, lon: 135.5023 },
  札幌: { lat: 43.0618, lon: 141.3545 },
  福岡: { lat: 33.5904, lon: 130.4017 },
  名古屋: { lat: 35.1815, lon: 136.9066 },
};

export const Weather = () => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState("Tokyo");

  const fetchWeather = useCallback(async (lat: number, lon: number) => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(
        `http://localhost:8000/api/weather?lat=${lat}&lon=${lon}`,
      );
      if (!response.ok) {
        throw new Error("Failed to fetch weather data");
      }
      const data: WeatherData = await response.json();
      setWeather(data);
    } catch {
      setError("天気情報の取得に失敗しました。");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (majorCities[selectedCity as keyof typeof majorCities]) {
      const city = majorCities[selectedCity as keyof typeof majorCities];
      fetchWeather(city.lat, city.lon);
    }
    // For "Current Location", fetch is triggered by the button click, so no action is needed here.
  }, [selectedCity, fetchWeather]);

  const handleCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          fetchWeather(position.coords.latitude, position.coords.longitude);
          setSelectedCity("Current Location"); // Update UI to reflect this choice
        },
        () => {
          setError("位置情報の取得に失敗しました。");
        },
      );
    } else {
      setError("お使いのブラウザは位置情報に対応していません。");
    }
  };

  return (
    <div>
      <div>
        <select
          value={selectedCity}
          onChange={(e) => setSelectedCity(e.target.value)}
        >
          {selectedCity === "Current Location" && (
            <option value="Current Location">現在地</option>
          )}
          {Object.keys(majorCities).map((city) => (
            <option key={city} value={city}>
              {city}
            </option>
          ))}
        </select>
        <button onClick={handleCurrentLocation}>現在地</button>
      </div>

      {loading && <div>天気を読み込み中...</div>}
      {error && <div>{error}</div>}
      {weather && !loading && !error && (
        <div>
          <h2>{weather.city}</h2>
          <div>
            <img
              src={`https://openweathermap.org/img/wn/${weather.icon}@2x.png`}
              alt={weather.description}
            />
            <span>{weather.description}</span>
          </div>
          <p>{weather.temperature}°C</p>
        </div>
      )}
    </div>
  );
};

import React, { useState, useEffect } from "react";
import "../../styles/components/dashboard/WeatherWidget.css";
import { getWeatherByCity, getWeatherByCoords } from "../../services/weather.service";
import { useLanguage } from "../../contexts/LanguageContext";

export default function WeatherWidget({ compact = false }) {
  const { t } = useLanguage();
  const [weather, setWeather] = useState({
    temp: 22,
    condition: "Có nắng",
    icon: "bi-sun",
    humidity: 65,
    wind: 12,
    location: "Hà Nội"
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Lấy dữ liệu thời tiết thật
  const fetchWeather = async () => {
    try {
      setLoading(true);
      setError(null);

      // Thử lấy vị trí từ browser trước
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;
            const weatherData = await getWeatherByCoords(latitude, longitude);
            setWeather(weatherData);
            setLoading(false);
          },
          async () => {
            // Nếu không lấy được vị trí, dùng thành phố mặc định
            const weatherData = await getWeatherByCity("Hanoi");
            setWeather(weatherData);
            setLoading(false);
          }
        );
      } else {
        // Browser không hỗ trợ geolocation, dùng thành phố mặc định
        const weatherData = await getWeatherByCity("Hanoi");
        setWeather(weatherData);
        setLoading(false);
      }
    } catch (err) {
      console.error("Error fetching weather:", err);
      setError(t("weather.error"));
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWeather();
    
    // Refresh mỗi 30 phút
    const interval = setInterval(fetchWeather, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const getWeatherColor = () => {
    if (weather.icon.includes("sun")) return "#fbbf24";
    if (weather.icon.includes("cloud-rain")) return "#60a5fa";
    if (weather.icon.includes("cloud")) return "#9ca3af";
    return "#fbbf24";
  };

  const getWeatherNote = () => {
    if (weather.icon.includes("sun")) {
      return t("weather.note.sunny");
    }
    if (weather.icon.includes("cloud-rain")) {
      return t("weather.note.rainy");
    }
    if (weather.icon.includes("cloud")) {
      return t("weather.note.cloudy");
    }
    return t("weather.note.default");
  };

  return (
    <div className={`weather-widget ${compact ? "weather-widget--compact" : ""}`}>
      <div className="weather-widget__header">
        <div className="weather-widget__location">
          <i className="bi bi-geo-alt-fill me-1" />
          <span>{weather.location}</span>
        </div>
        <button 
          className="weather-widget__refresh" 
          title={t("weather.refresh")}
          onClick={fetchWeather}
          disabled={loading}
        >
          <i className={`bi bi-arrow-clockwise ${loading ? "weather-widget__refresh--spinning" : ""}`} />
        </button>
      </div>

      {loading ? (
        <div className="weather-widget__loading">
          <i className="bi bi-arrow-repeat weather-widget__spinner" />
          <span>{t("weather.loading")}</span>
        </div>
      ) : error ? (
        <div className="weather-widget__error">
          <i className="bi bi-exclamation-triangle" />
          <span>{error}</span>
        </div>
      ) : (
        <div className="weather-widget__main">
          <div className="weather-widget__icon" style={{ color: getWeatherColor() }}>
            <i className={`bi ${weather.icon}`} />
          </div>
          <div className="weather-widget__temp">
            <span className="weather-widget__temp-value">{weather.temp}</span>
            <span className="weather-widget__temp-unit">°C</span>
          </div>
          <div className="weather-widget__condition">{weather.condition}</div>
          <div className="weather-widget__note">
            <i className="bi bi-info-circle me-1" />
            <span>{getWeatherNote()}</span>
          </div>
        </div>
      )}

      <div className="weather-widget__details">
        <div className="weather-widget__detail-item">
          <i className="bi bi-droplet" />
          <div>
            <span className="weather-widget__detail-label">{t("weather.humidity")}</span>
            <span className="weather-widget__detail-value">{weather.humidity}%</span>
          </div>
        </div>
        <div className="weather-widget__detail-item">
          <i className="bi bi-wind" />
          <div>
            <span className="weather-widget__detail-label">{t("weather.wind")}</span>
            <span className="weather-widget__detail-value">{weather.wind} km/h</span>
          </div>
        </div>
      </div>
    </div>
  );
}


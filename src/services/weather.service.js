/**
 * Weather Service - Lấy dữ liệu thời tiết từ OpenWeatherMap API
 */

const WEATHER_API_KEY = process.env.REACT_APP_WEATHER_API_KEY || "";
const WEATHER_API_URL = "https://api.openweathermap.org/data/2.5/weather";

/**
 * Lấy thời tiết theo tên thành phố
 */
export async function getWeatherByCity(cityName = "Hanoi") {
  if (!WEATHER_API_KEY) {
    console.warn("Weather API key not found. Using fallback data.");
    return getFallbackWeather(cityName);
  }

  try {
    const response = await fetch(
      `${WEATHER_API_URL}?q=${encodeURIComponent(cityName)}&appid=${WEATHER_API_KEY}&units=metric&lang=vi`
    );

    if (!response.ok) {
      throw new Error(`Weather API error: ${response.status}`);
    }

    const data = await response.json();
    return mapWeatherData(data);
  } catch (error) {
    console.error("Error fetching weather:", error);
    return getFallbackWeather(cityName);
  }
}

/**
 * Lấy thời tiết theo tọa độ (lat, lon)
 */
export async function getWeatherByCoords(lat, lon) {
  if (!WEATHER_API_KEY) {
    console.warn("Weather API key not found. Using fallback data.");
    return getFallbackWeather("Hanoi");
  }

  try {
    const response = await fetch(
      `${WEATHER_API_URL}?lat=${lat}&lon=${lon}&appid=${WEATHER_API_KEY}&units=metric&lang=vi`
    );

    if (!response.ok) {
      throw new Error(`Weather API error: ${response.status}`);
    }

    const data = await response.json();
    return mapWeatherData(data);
  } catch (error) {
    console.error("Error fetching weather:", error);
    return getFallbackWeather("Hanoi");
  }
}

/**
 * Map dữ liệu từ OpenWeatherMap API sang format của app
 */
function mapWeatherData(data) {
  const conditionCode = data.weather[0]?.main || "Clear";
  const conditionId = data.weather[0]?.id || 800;
  const description = data.weather[0]?.description || "";

  return {
    temp: Math.round(data.main.temp),
    condition: getVietnameseCondition(conditionCode, description),
    icon: getWeatherIcon(conditionId, conditionCode),
    humidity: data.main.humidity,
    wind: Math.round((data.wind.speed * 3.6) || 0), // m/s to km/h
    location: data.name || "Hà Nội",
    feelsLike: Math.round(data.main.feels_like),
    pressure: data.main.pressure,
    visibility: data.visibility ? (data.visibility / 1000).toFixed(1) : null,
  };
}

/**
 * Map weather condition code sang icon Bootstrap
 */
function getWeatherIcon(conditionId, conditionCode) {
  // Clear sky
  if (conditionId === 800) return "bi-sun-fill";
  if (conditionId === 801) return "bi-sun";
  
  // Clouds
  if (conditionId >= 802 && conditionId <= 804) return "bi-cloud";
  
  // Rain
  if (conditionId >= 200 && conditionId < 300) return "bi-cloud-lightning-rain";
  if (conditionId >= 300 && conditionId < 400) return "bi-cloud-drizzle";
  if (conditionId >= 500 && conditionId < 600) return "bi-cloud-rain";
  
  // Snow
  if (conditionId >= 600 && conditionId < 700) return "bi-snow";
  
  // Atmosphere
  if (conditionId >= 700 && conditionId < 800) return "bi-cloud-fog";
  
  // Default
  return "bi-sun";
}

/**
 * Map condition sang tiếng Việt
 */
function getVietnameseCondition(conditionCode, description) {
  const conditionMap = {
    Clear: "Trời quang",
    Clouds: "Có mây",
    Rain: "Có mưa",
    Drizzle: "Mưa phùn",
    Thunderstorm: "Có giông",
    Snow: "Có tuyết",
    Mist: "Sương mù",
    Fog: "Sương mù",
    Haze: "Sương mù nhẹ",
    Dust: "Bụi",
    Sand: "Cát",
    Ash: "Tro",
    Squall: "Giông tố",
    Tornado: "Lốc xoáy",
  };

  return conditionMap[conditionCode] || description || "Trời quang";
}

/**
 * Fallback data khi không có API key hoặc lỗi
 */
function getFallbackWeather(cityName) {
  const now = new Date();
  const hour = now.getHours();
  
  // Giả lập thời tiết theo giờ
  let condition, icon, temp;
  if (hour >= 6 && hour < 18) {
    // Ban ngày
    condition = "Có nắng";
    icon = "bi-sun";
    temp = 22 + Math.floor(Math.random() * 8);
  } else {
    // Ban đêm
    condition = "Trời quang";
    icon = "bi-moon-stars";
    temp = 18 + Math.floor(Math.random() * 6);
  }

  return {
    temp,
    condition,
    icon,
    humidity: 60 + Math.floor(Math.random() * 20),
    wind: 8 + Math.floor(Math.random() * 10),
    location: cityName === "Hanoi" ? "Hà Nội" : cityName,
    feelsLike: temp - 2,
    pressure: 1013,
    visibility: 10,
  };
}


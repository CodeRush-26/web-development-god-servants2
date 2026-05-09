const WEATHER_BOUNDS = {
  minLat: 24,
  maxLat: 27,
  minLng: 55,
  maxLng: 61,
};

const WEATHER_TTL_MS = 10 * 60 * 1000;
let weatherCache = { updatedAt: 0, cells: [] };

function isAdverseCell(cell) {
  return (
    Number(cell.windSpeed || 0) >= 12 ||
    Number(cell.waveHeight || 0) >= 1.5 ||
    Number(cell.precip || 0) >= 0.2
  );
}

function buildGridFromOpenMeteo(data) {
  const hourly = data?.hourly || {};
  const times = hourly.time || [];
  const idx = 0;
  if (!times.length) return [];

  const cells = [];
  for (let lat = WEATHER_BOUNDS.minLat; lat <= WEATHER_BOUNDS.maxLat; lat += 0.5) {
    for (let lng = WEATHER_BOUNDS.minLng; lng <= WEATHER_BOUNDS.maxLng; lng += 0.5) {
      const wind = Number(hourly.wind_speed_10m?.[idx] || 0);
      const precip = Number(hourly.precipitation?.[idx] || 0);
      const waveHeight = Number(hourly.wave_height?.[idx] || 0);
      const cell = {
        id: `${lat.toFixed(2)}_${lng.toFixed(2)}`,
        lat: Number(lat.toFixed(2)),
        lng: Number(lng.toFixed(2)),
        windSpeed: wind,
        precip,
        waveHeight,
      };
      cell.adverse = isAdverseCell(cell);
      cells.push(cell);
    }
  }
  return cells;
}

async function fetchOpenMeteoWeather() {
  const now = Date.now();
  if (now - weatherCache.updatedAt < WEATHER_TTL_MS && weatherCache.cells.length) {
    return weatherCache;
  }

  const url =
    "https://marine-api.open-meteo.com/v1/marine?latitude=25.2&longitude=57.0&hourly=wave_height,wind_speed_10m,precipitation";
  try {
    const res = await fetch(url);
    const data = await res.json();
    const cells = buildGridFromOpenMeteo(data);
    weatherCache = { updatedAt: now, cells };
  } catch {
    if (!weatherCache.cells.length) {
      weatherCache = { updatedAt: now, cells: [] };
    }
  }
  return weatherCache;
}

function nearestWeatherCell(lat, lng, cells = weatherCache.cells) {
  let best = null;
  let bestD = Number.POSITIVE_INFINITY;
  cells.forEach((c) => {
    const d = (lat - c.lat) ** 2 + (lng - c.lng) ** 2;
    if (d < bestD) {
      bestD = d;
      best = c;
    }
  });
  return best;
}

function isAdverseWeather(lat, lng, cells = weatherCache.cells) {
  const cell = nearestWeatherCell(lat, lng, cells);
  return !!cell?.adverse;
}

function getWeatherCache() {
  return weatherCache;
}

module.exports = {
  fetchOpenMeteoWeather,
  isAdverseWeather,
  nearestWeatherCell,
  getWeatherCache,
};

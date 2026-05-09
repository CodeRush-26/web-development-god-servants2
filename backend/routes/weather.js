const express = require("express");
const { fetchOpenMeteoWeather, getWeatherCache } = require("../simulator/weather");

function createWeatherRouter() {
  const router = express.Router();

  router.get("/", async (req, res) => {
    await fetchOpenMeteoWeather();
    const cache = getWeatherCache();
    return res.json({
      updatedAt: cache.updatedAt,
      cells: cache.cells,
      source: "open-meteo",
    });
  });

  return router;
}

module.exports = { createWeatherRouter };

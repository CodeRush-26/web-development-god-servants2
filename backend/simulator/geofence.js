function pointInPolygon(lat, lng, polygonCoords = []) {
  if (!Array.isArray(polygonCoords) || polygonCoords.length < 3) return false;
  let inside = false;

  for (let i = 0, j = polygonCoords.length - 1; i < polygonCoords.length; j = i++) {
    const xi = Number(polygonCoords[i]?.lat);
    const yi = Number(polygonCoords[i]?.lng);
    const xj = Number(polygonCoords[j]?.lat);
    const yj = Number(polygonCoords[j]?.lng);
    if (![xi, yi, xj, yj].every(Number.isFinite)) continue;

    const intersect = yi > lng !== yj > lng && lat < ((xj - xi) * (lng - yi)) / (yj - yi + 1e-12) + xi;
    if (intersect) inside = !inside;
  }

  return inside;
}

function checkAllShips(ships = [], zones = [], previousInsidePairs = new Set()) {
  const nextInsidePairs = new Set();
  const newBreaches = [];

  ships.forEach((ship) => {
    const lat = Number(ship?.lat);
    const lng = Number(ship?.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || !ship?.id) return;

    zones.forEach((zone) => {
      if (!zone?.id || !Array.isArray(zone?.coords)) return;
      if (!pointInPolygon(lat, lng, zone.coords)) return;

      const key = `${ship.id}::${zone.id}`;
      nextInsidePairs.add(key);
      if (!previousInsidePairs.has(key)) {
        newBreaches.push({
          shipId: ship.id,
          zoneId: zone.id,
          lat,
          lng,
          createdAt: Date.now(),
        });
      }
    });
  });

  return { newBreaches, nextInsidePairs };
}

module.exports = { pointInPolygon, checkAllShips };

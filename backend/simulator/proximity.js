const { getDistance } = require("./utils");

function pairKey(a, b) {
  return [a, b].sort().join("::");
}

function checkProximity(ships = [], thresholdKm = 2) {
  const warnings = [];
  for (let i = 0; i < ships.length; i += 1) {
    for (let j = i + 1; j < ships.length; j += 1) {
      const a = ships[i];
      const b = ships[j];
      if (!a?.id || !b?.id) continue;
      const d = getDistance(Number(a.lat), Number(a.lng), Number(b.lat), Number(b.lng));
      if (!Number.isFinite(d)) continue;
      if (d < thresholdKm) {
        warnings.push({
          key: pairKey(a.id, b.id),
          shipA: a.id,
          shipB: b.id,
          distanceKm: Number(d.toFixed(3)),
          createdAt: Date.now(),
        });
      }
    }
  }
  return warnings;
}

module.exports = { checkProximity, pairKey };

const { getDistance } = require("./utils");
const { pointInPolygon } = require("./geofence");

function expandedZoneBbox(zone, expand = 0.12) {
  const lats = zone.coords.map((p) => Number(p.lat)).filter(Number.isFinite);
  const lngs = zone.coords.map((p) => Number(p.lng)).filter(Number.isFinite);
  if (!lats.length || !lngs.length) return null;
  return {
    minLat: Math.min(...lats) - expand,
    maxLat: Math.max(...lats) + expand,
    minLng: Math.min(...lngs) - expand,
    maxLng: Math.max(...lngs) + expand,
  };
}

function segmentIntersectsZones(a, b, zones = []) {
  const samples = 28;
  for (let i = 0; i <= samples; i += 1) {
    const t = i / samples;
    const lat = a.lat + (b.lat - a.lat) * t;
    const lng = a.lng + (b.lng - a.lng) * t;
    for (const zone of zones) {
      if (pointInPolygon(lat, lng, zone.coords)) return true;
    }
  }
  return false;
}

function pathDistanceKm(start, waypoints) {
  if (!waypoints.length) return 0;
  let d = 0;
  let prev = start;
  for (const p of waypoints) {
    d += getDistance(prev.lat, prev.lng, p.lat, p.lng);
    prev = p;
  }
  return d;
}

function computeRoute(ship, destination, zones = []) {
  const start = { lat: Number(ship.lat), lng: Number(ship.lng) };
  const dest = { lat: Number(destination.lat), lng: Number(destination.lng) };
  if (![start.lat, start.lng, dest.lat, dest.lng].every(Number.isFinite)) {
    return { status: "stranded", waypoints: [] };
  }

  const direct = [dest];
  if (!segmentIntersectsZones(start, dest, zones)) {
    return { status: "ok", waypoints: direct, distanceKm: pathDistanceKm(start, direct) };
  }

  const candidates = [];
  for (const zone of zones) {
    const box = expandedZoneBbox(zone, 0.14);
    if (!box) continue;
    const around = [
      { lat: box.minLat, lng: box.minLng },
      { lat: box.minLat, lng: box.maxLng },
      { lat: box.maxLat, lng: box.minLng },
      { lat: box.maxLat, lng: box.maxLng },
      { lat: (box.minLat + box.maxLat) / 2, lng: box.minLng },
      { lat: (box.minLat + box.maxLat) / 2, lng: box.maxLng },
    ];
    for (const mid of around) {
      const blocked = segmentIntersectsZones(start, mid, zones) || segmentIntersectsZones(mid, dest, zones);
      if (!blocked) {
        const path = [mid, dest];
        candidates.push({ waypoints: path, distanceKm: pathDistanceKm(start, path) });
      }
    }
  }

  if (!candidates.length) return { status: "stranded", waypoints: [] };
  candidates.sort((a, b) => a.distanceKm - b.distanceKm);
  return { status: "ok", waypoints: candidates[0].waypoints, distanceKm: candidates[0].distanceKm };
}

module.exports = { computeRoute };

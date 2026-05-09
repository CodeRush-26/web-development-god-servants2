const EARTH_RADIUS_KM = 6371;

function toRad(deg) {
  return (deg * Math.PI) / 180;
}

function toDeg(rad) {
  return (rad * 180) / Math.PI;
}

function normalizeHeading(deg) {
  const n = ((deg % 360) + 360) % 360;
  // avoid -0
  return n === 0 ? 0 : n;
}

// Signed shortest angular difference from -> to in degrees, range [-180, 180]
function shortestTurn(fromDeg, toDeg) {
  const a = normalizeHeading(fromDeg);
  const b = normalizeHeading(toDeg);
  let diff = b - a;
  diff = ((diff + 540) % 360) - 180;
  return diff;
}

// Haversine distance between two lat/lng points (km)
function getDistance(lat1, lng1, lat2, lng2) {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const rLat1 = toRad(lat1);
  const rLat2 = toRad(lat2);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rLat1) * Math.cos(rLat2) * Math.sin(dLng / 2) ** 2;

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(a)));
}

// Initial bearing from point A -> point B (degrees 0-360)
function getBearing(lat1, lng1, lat2, lng2) {
  const rLat1 = toRad(lat1);
  const rLat2 = toRad(lat2);
  const dLng = toRad(lng2 - lng1);

  const y = Math.sin(dLng) * Math.cos(rLat2);
  const x =
    Math.cos(rLat1) * Math.sin(rLat2) -
    Math.sin(rLat1) * Math.cos(rLat2) * Math.cos(dLng);

  return normalizeHeading(toDeg(Math.atan2(y, x)));
}

// Advance position given heading/speed over deltaSeconds.
// Uses a simple local-plane approximation appropriate for small per-tick steps.
function advancePosition(lat, lng, headingDeg, speedKnots, deltaSeconds) {
  const headingRad = toRad(normalizeHeading(headingDeg));

  // knots -> nautical miles per second
  const nmPerSecond = speedKnots / 3600;
  const nm = nmPerSecond * deltaSeconds;

  // 1 nautical mile = 1 arc-minute of latitude
  const deltaLatDeg = (nm * Math.cos(headingRad)) / 60;

  // longitude degrees shrink by cos(latitude)
  const cosLat = Math.cos(toRad(lat));
  const safeCosLat = Math.abs(cosLat) < 1e-6 ? 1e-6 : cosLat;
  const deltaLngDeg = (nm * Math.sin(headingRad)) / (60 * safeCosLat);

  return { lat: lat + deltaLatDeg, lng: lng + deltaLngDeg };
}

module.exports = {
  getDistance,
  getBearing,
  advancePosition,
  normalizeHeading,
  shortestTurn,
};


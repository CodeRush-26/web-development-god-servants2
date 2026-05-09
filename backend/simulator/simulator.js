const { initialFleet } = require("./fleet");
const {
  advancePosition,
  getBearing,
  getDistance,
  normalizeHeading,
  shortestTurn,
} = require("./utils");
const { computeRoute } = require("./router");
const { fetchOpenMeteoWeather, isAdverseWeather } = require("./weather");

const DEFAULT_TICK_MS = 1000;
const ARRIVAL_DISTANCE_KM = 0.5;
const MAX_TURN_DEG_PER_TICK = 2;
const FUEL_BURN_PER_TICK = 0.005; // % per tick at 1Hz (tune for demo)
const ROUTE_REACH_KM = 0.1;
const FUEL_PER_KM_BASE = 0.04;

// Optional bounding box to keep demo visually alive (Strait of Hormuz-ish)
const BOUNDS = {
  minLat: 24.0,
  maxLat: 27.5,
  minLng: 55.0,
  maxLng: 60.5,
};

let fleetState = initialFleet.map((s) => ({ ...s }));
let tick = 0;
let intervalHandle = null;
let restrictedZones = [];
const historyBuffer = [];
let lastHistoryAt = 0;
const HISTORY_INTERVAL_MS = 30 * 1000;
const HISTORY_MAX = 120;

// Central sea lane through Strait of Hormuz and Gulf of Oman.
// Ships are constrained to stay near this lane (buffer in degrees).
const SEA_LANE = [
  { lat: 25.08, lng: 55.12 }, // Dubai approach
  { lat: 25.32, lng: 55.55 },
  { lat: 25.58, lng: 56.05 }, // Strait entry
  { lat: 25.88, lng: 56.55 },
  { lat: 26.03, lng: 57.05 }, // Strait core
  { lat: 25.92, lng: 57.55 },
  { lat: 25.72, lng: 58.15 },
  { lat: 25.42, lng: 58.85 },
  { lat: 25.10, lng: 59.55 },
  { lat: 24.86, lng: 60.20 }, // Oman sea
];

const SEA_LANE_BUFFER_DEG = 0.09; // tighter lane ~10 km

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function keepInBounds(ship) {
  // wrap-around (torus) so ships never disappear from the demo map
  if (ship.lat < BOUNDS.minLat) ship.lat = BOUNDS.maxLat;
  if (ship.lat > BOUNDS.maxLat) ship.lat = BOUNDS.minLat;
  if (ship.lng < BOUNDS.minLng) ship.lng = BOUNDS.maxLng;
  if (ship.lng > BOUNDS.maxLng) ship.lng = BOUNDS.minLng;
}

function nearestPointOnSegment(p, a, b) {
  const abLat = b.lat - a.lat;
  const abLng = b.lng - a.lng;
  const denom = abLat * abLat + abLng * abLng || 1e-12;
  const t = ((p.lat - a.lat) * abLat + (p.lng - a.lng) * abLng) / denom;
  const clampedT = clamp(t, 0, 1);
  return {
    lat: a.lat + abLat * clampedT,
    lng: a.lng + abLng * clampedT,
  };
}

function nearestPointOnSeaLane(lat, lng) {
  const p = { lat, lng };
  let best = SEA_LANE[0];
  let bestD = Number.POSITIVE_INFINITY;

  for (let i = 0; i < SEA_LANE.length - 1; i += 1) {
    const cand = nearestPointOnSegment(p, SEA_LANE[i], SEA_LANE[i + 1]);
    const d = (lat - cand.lat) ** 2 + (lng - cand.lng) ** 2;
    if (d < bestD) {
      bestD = d;
      best = cand;
    }
  }

  return { point: best, distanceDeg: Math.sqrt(bestD) };
}

function isInWater(lat, lng) {
  const { distanceDeg } = nearestPointOnSeaLane(lat, lng);
  if (distanceDeg > SEA_LANE_BUFFER_DEG) return false;

  // Extra coastal guards to avoid hugging Iranian/Omani land edges.
  if (lng < 56.0 && lat > 25.65) return false;
  if (lng >= 56.0 && lng <= 58.8 && lat > 26.12) return false;
  if (lng > 58.8 && lat > 25.9) return false;

  return true;
}

function snapToSeaLane(ship) {
  const { point } = nearestPointOnSeaLane(ship.lat, ship.lng);
  ship.lat = point.lat;
  ship.lng = point.lng;
}

function updateShip(ship, deltaSeconds) {
  // normalize input fields defensively
  ship.heading = normalizeHeading(ship.heading);
  ship.fuel = clamp(ship.fuel, 0, 100);

  if (ship.status === "arrived" || ship.status === "stopped") {
    ship.speed = 0;
    return ship;
  }

  const destination = {
    lat: Number(ship.destinationLat),
    lng: Number(ship.destinationLng),
  };
  if (!Array.isArray(ship.routeWaypoints) || ship.routeWaypoints.length === 0 || ship.status === "rerouting") {
    const route = computeRoute(ship, destination, restrictedZones);
    ship.routeWaypoints = route.waypoints || [];
    ship.routeDistanceKm = Number(route.distanceKm || 0);
    ship.status = route.status === "stranded" ? "stranded" : ship.status === "rerouting" ? "rerouting" : "normal";
  }

  // arrival check first (in case ship spawns close)
  const distKm = getDistance(
    ship.lat,
    ship.lng,
    ship.destinationLat,
    ship.destinationLng
  );
  if (distKm <= ARRIVAL_DISTANCE_KM) {
    ship.status = "arrived";
    ship.speed = 0;
    ship.lat = ship.destinationLat;
    ship.lng = ship.destinationLng;
    return ship;
  }

  const nextWp = ship.routeWaypoints?.[0] || destination;
  const adverse = isAdverseWeather(ship.lat, ship.lng);
  const fuelPenalty = adverse ? 1.3 : 1;
  const currentSpeed = Math.max(0, Number(ship.speed) || 0);
  // Knots are nautical miles per hour. Convert tick duration to hours.
  const distThisTickKm = currentSpeed * 1.852 * (deltaSeconds / 3600);
  const fuelBurn = Math.max(FUEL_BURN_PER_TICK, distThisTickKm * FUEL_PER_KM_BASE * fuelPenalty);
  ship.fuel = clamp(ship.fuel - fuelBurn, 0, 100);
  ship.weatherAdverse = adverse;
  ship.fuelPerKm = FUEL_PER_KM_BASE * fuelPenalty;
  if (ship.fuel <= 0) {
    ship.status = "stopped";
    ship.speed = 0;
    return ship;
  }

  // steering: nudge heading toward destination
  const desired = getBearing(
    ship.lat,
    ship.lng,
    nextWp.lat,
    nextWp.lng
  );
  const turn = clamp(
    shortestTurn(ship.heading, desired),
    -MAX_TURN_DEG_PER_TICK,
    MAX_TURN_DEG_PER_TICK
  );
  ship.heading = normalizeHeading(ship.heading + turn);

  // move
  const next = advancePosition(ship.lat, ship.lng, ship.heading, ship.speed, deltaSeconds);
  ship.lat = next.lat;
  ship.lng = next.lng;

  keepInBounds(ship);
  if (!isInWater(ship.lat, ship.lng)) {
    snapToSeaLane(ship);
    ship.status = ship.status === "arrived" ? "arrived" : "rerouting";
  }
  if (ship.routeWaypoints?.length) {
    const wp = ship.routeWaypoints[0];
    const dWp = getDistance(ship.lat, ship.lng, wp.lat, wp.lng);
    if (dWp <= ROUTE_REACH_KM) {
      ship.routeWaypoints.shift();
    }
  }
  ship.distanceToDestinationKm = getDistance(
    ship.lat,
    ship.lng,
    Number(ship.destinationLat),
    Number(ship.destinationLng)
  );
  ship.fuelRangeKm = ship.fuelPerKm > 0 ? ship.fuel / ship.fuelPerKm : 0;
  ship.insufficientFuel = ship.fuelRangeKm + 0.1 < ship.distanceToDestinationKm;
  return ship;
}

function getFleetSnapshot() {
  return {
    ships: fleetState.map((s) => ({ ...s })),
    tick,
    serverTime: Date.now(),
  };
}

function addHistorySnapshot(snapshot) {
  historyBuffer.unshift({
    timestamp: snapshot.serverTime,
    tick: snapshot.tick,
    ships: snapshot.ships.map((s) => ({ ...s })),
  });
  if (historyBuffer.length > HISTORY_MAX) historyBuffer.length = HISTORY_MAX;
}

function getPlaybackHistory() {
  return historyBuffer.slice();
}

function getPlaybackSnapshotAt(timestamp) {
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || historyBuffer.length === 0) return null;
  let best = historyBuffer[0];
  let bestDiff = Math.abs(best.timestamp - ts);
  historyBuffer.forEach((snap) => {
    const diff = Math.abs(snap.timestamp - ts);
    if (diff < bestDiff) {
      best = snap;
      bestDiff = diff;
    }
  });
  return best;
}

function applyDirective(shipId, directive = {}) {
  const id = String(shipId || "").toUpperCase();
  let changed = false;

  fleetState = fleetState.map((ship) => {
    if (ship.id !== id) return ship;
    changed = true;

    const next = { ...ship };
    const action = String(directive.action || directive.type || "").toUpperCase();

    if (action === "HOLD_POSITION") {
      next.status = "stopped";
      next.speed = 0;
      return next;
    }

    if (action === "REROUTE") {
      const destinationLat = Number(directive.destinationLat);
      const destinationLng = Number(directive.destinationLng);
      if (Number.isFinite(destinationLat) && Number.isFinite(destinationLng)) {
        next.destinationLat = destinationLat;
        next.destinationLng = destinationLng;
      }
      if (directive.destinationName) {
        next.destination = String(directive.destinationName);
      }
      if (next.status === "stopped") {
        next.speed = 10;
      }
      next.status = "rerouting";
    }

    return next;
  });

  return changed;
}

function markShipsRerouting(shipIds = []) {
  const idSet = new Set(shipIds.map((id) => String(id || "").toUpperCase()));
  if (idSet.size === 0) return false;
  let changed = false;

  fleetState = fleetState.map((ship) => {
    if (!idSet.has(String(ship.id || "").toUpperCase())) return ship;
    if (ship.status !== "arrived" && ship.status !== "stopped") {
      changed = true;
      return { ...ship, status: "rerouting" };
    }
    return ship;
  });

  return changed;
}

function setRestrictedZones(zones = []) {
  restrictedZones = Array.isArray(zones) ? zones : [];
  fleetState = fleetState.map((ship) => ({ ...ship, status: "rerouting" }));
}

function startSimulator(io, options = {}) {
  const tickMs = typeof options.tickMs === "number" ? options.tickMs : DEFAULT_TICK_MS;

  if (intervalHandle) {
    return {
      stop: stopSimulator,
      getFleetSnapshot,
      applyDirective,
      markShipsRerouting,
      setRestrictedZones,
      getPlaybackHistory,
      getPlaybackSnapshotAt,
    };
  }

  intervalHandle = setInterval(() => {
    tick += 1;
    const deltaSeconds = tickMs / 1000;
    fetchOpenMeteoWeather();
    fleetState = fleetState.map((ship) => updateShip({ ...ship }, deltaSeconds));
    const snapshot = getFleetSnapshot();
    if (snapshot.serverTime - lastHistoryAt >= HISTORY_INTERVAL_MS) {
      addHistorySnapshot(snapshot);
      lastHistoryAt = snapshot.serverTime;
    }

    if (io) {
      io.emit("fleet:update", snapshot);
    }
  }, tickMs);

  return {
    stop: stopSimulator,
    getFleetSnapshot,
    applyDirective,
    markShipsRerouting,
    setRestrictedZones,
    getPlaybackHistory,
    getPlaybackSnapshotAt,
  };
}

fleetState = fleetState.map((ship) => {
  const next = { ...ship };
  if (!isInWater(next.lat, next.lng)) {
    snapToSeaLane(next);
  }
  return next;
});

function stopSimulator() {
  if (!intervalHandle) return;
  clearInterval(intervalHandle);
  intervalHandle = null;
}

module.exports = {
  startSimulator,
  stopSimulator,
  getFleetSnapshot,
  applyDirective,
  markShipsRerouting,
  setRestrictedZones,
  getPlaybackHistory,
  getPlaybackSnapshotAt,
};


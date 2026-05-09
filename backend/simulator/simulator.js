const { initialFleet } = require("./fleet");
const {
  advancePosition,
  getBearing,
  getDistance,
  normalizeHeading,
  shortestTurn,
} = require("./utils");

const DEFAULT_TICK_MS = 1000;
const ARRIVAL_DISTANCE_KM = 0.5;
const MAX_TURN_DEG_PER_TICK = 2;
const FUEL_BURN_PER_TICK = 0.005; // % per tick at 1Hz (tune for demo)

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

function updateShip(ship, deltaSeconds) {
  // normalize input fields defensively
  ship.heading = normalizeHeading(ship.heading);
  ship.fuel = clamp(ship.fuel, 0, 100);

  if (ship.status === "arrived" || ship.status === "stopped") {
    ship.speed = 0;
    return ship;
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

  // fuel burn
  ship.fuel = clamp(ship.fuel - FUEL_BURN_PER_TICK, 0, 100);
  if (ship.fuel <= 0) {
    ship.status = "stopped";
    ship.speed = 0;
    return ship;
  }

  // steering: nudge heading toward destination
  const desired = getBearing(
    ship.lat,
    ship.lng,
    ship.destinationLat,
    ship.destinationLng
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
  return ship;
}

function getFleetSnapshot() {
  return {
    ships: fleetState.map((s) => ({ ...s })),
    tick,
    serverTime: Date.now(),
  };
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

function startSimulator(io, options = {}) {
  const tickMs = typeof options.tickMs === "number" ? options.tickMs : DEFAULT_TICK_MS;

  if (intervalHandle) return { stop: stopSimulator, getFleetSnapshot, applyDirective };

  intervalHandle = setInterval(() => {
    tick += 1;
    const deltaSeconds = tickMs / 1000;
    fleetState = fleetState.map((ship) => updateShip({ ...ship }, deltaSeconds));

    if (io) {
      io.emit("fleet:update", getFleetSnapshot());
    }
  }, tickMs);

  return { stop: stopSimulator, getFleetSnapshot, applyDirective };
}

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
};


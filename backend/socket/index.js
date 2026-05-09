const { checkAllShips } = require("../simulator/geofence");

const pendingDirectives = [];
const directiveResponses = [];
const zones = [];
const alerts = [];
let insidePairs = new Set();
let geofenceLoopStarted = false;

function makeAlertFromBreach(breach) {
  return {
    id: `alert_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    type: "GEOFENCE_BREACH",
    shipId: breach.shipId,
    zoneId: breach.zoneId,
    message: `${breach.shipId} entered restricted zone ${breach.zoneId}`,
    acknowledged: false,
    createdAt: breach.createdAt || Date.now(),
  };
}

function runGeofenceCheck(io, getFleetSnapshot, markShipsRerouting) {
  if (typeof getFleetSnapshot !== "function") return;
  const snapshot = getFleetSnapshot();
  const { newBreaches, nextInsidePairs } = checkAllShips(snapshot?.ships || [], zones, insidePairs);
  insidePairs = nextInsidePairs;
  if (newBreaches.length === 0) return;

  const rerouteIds = [];
  newBreaches.forEach((breach) => {
    rerouteIds.push(breach.shipId);
    const alert = makeAlertFromBreach(breach);
    alerts.unshift(alert);
    if (alerts.length > 500) alerts.length = 500;
    io.emit("alert:new", alert);
  });

  if (typeof markShipsRerouting === "function") {
    markShipsRerouting(rerouteIds);
  }
  io.emit("fleet:update", getFleetSnapshot());
}

function initSocket(io, getFleetSnapshot, applyDirective, markShipsRerouting, setRestrictedZones) {
  if (!geofenceLoopStarted) {
    geofenceLoopStarted = true;
    setInterval(() => runGeofenceCheck(io, getFleetSnapshot, markShipsRerouting), 1000);
  }

  io.on("connection", (socket) => {
    console.log(`Client connected: ${socket.id}`);

    if (typeof getFleetSnapshot === "function") {
      socket.emit("fleet:update", getFleetSnapshot());
    }
    socket.emit("directive:sync", {
      pendingDirectives,
      directiveResponses,
    });
    socket.emit("zone:sync", { zones });
    socket.emit("alert:sync", { alerts });

    socket.on("directive:send", (payload) => {
      const shipId = String(payload?.shipId || "").toUpperCase();
      if (!shipId) return;

      const event = {
        id: `dir_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        shipId,
        type: payload?.type || "REROUTE",
        message: payload?.message || "",
        destinationLat: payload?.destinationLat,
        destinationLng: payload?.destinationLng,
        destinationName: payload?.destinationName,
        from: payload?.from || "command",
        createdAt: Date.now(),
      };

      pendingDirectives.unshift(event);
      if (pendingDirectives.length > 200) pendingDirectives.length = 200;
      io.emit("directive:sent", event);
    });

    socket.on("zone:add", (payload) => {
      const coords = Array.isArray(payload?.coords) ? payload.coords : [];
      if (coords.length < 3) return;
      const zone = {
        id: payload?.id || `zone_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        coords: coords
          .map((p) => ({ lat: Number(p?.lat), lng: Number(p?.lng) }))
          .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng)),
        createdAt: Date.now(),
      };
      if (zone.coords.length < 3) return;

      zones.unshift(zone);
      if (zones.length > 50) zones.length = 50;
      if (typeof setRestrictedZones === "function") setRestrictedZones(zones);
      io.emit("zone:added", zone);
      runGeofenceCheck(io, getFleetSnapshot, markShipsRerouting);
    });

    socket.on("zone:remove", (payload) => {
      const zoneId = String(payload?.zoneId || "");
      if (!zoneId) return;
      const idx = zones.findIndex((z) => z.id === zoneId);
      if (idx < 0) return;
      zones.splice(idx, 1);
      if (typeof setRestrictedZones === "function") setRestrictedZones(zones);
      insidePairs = new Set(Array.from(insidePairs).filter((key) => !key.endsWith(`::${zoneId}`)));
      for (let i = alerts.length - 1; i >= 0; i -= 1) {
        if (alerts[i]?.zoneId === zoneId) {
          alerts.splice(i, 1);
        }
      }
      io.emit("zone:removed", { zoneId });
      io.emit("alert:sync", { alerts });
    });

    socket.on("directive:response", (payload) => {
      const shipId = String(payload?.shipId || "").toUpperCase();
      const action = String(payload?.action || "").toUpperCase();
      if (!shipId || !action) return;

      const event = {
        id: `resp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        shipId,
        action,
        message: payload?.message || "",
        from: payload?.from || "captain",
        directiveId: payload?.directiveId || null,
        createdAt: Date.now(),
      };

      if (action === "ACCEPT" && typeof applyDirective === "function") {
        applyDirective(shipId, payload?.directive || {});
      }

      const idx = pendingDirectives.findIndex((d) => d.id === event.directiveId);
      if (idx >= 0) pendingDirectives.splice(idx, 1);
      directiveResponses.unshift(event);
      if (directiveResponses.length > 300) directiveResponses.length = 300;

      io.emit("directive:response", event);
      if (typeof getFleetSnapshot === "function") {
        io.emit("fleet:update", getFleetSnapshot());
      }
    });

    socket.on("alert:ack", (payload) => {
      const alertId = String(payload?.alertId || "");
      if (!alertId) return;
      const alert = alerts.find((a) => a.id === alertId);
      if (!alert || alert.acknowledged) return;
      alert.acknowledged = true;
      alert.acknowledgedAt = Date.now();
      io.emit("alert:acked", { alertId, acknowledgedAt: alert.acknowledgedAt });
    });

    socket.on("disconnect", () => {
      console.log(`Client disconnected: ${socket.id}`);
    });
  });
}

module.exports = { initSocket };


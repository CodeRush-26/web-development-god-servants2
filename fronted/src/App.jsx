import { useEffect, useMemo, useState } from "react";
import socket from "./socket";
import Login from "./pages/Login";
import CommandView from "./pages/CommandView";
import CaptainView from "./pages/CaptainView";
import ToastStack from "./components/ToastStack";
import Timeline from "./components/Timeline";

function sanitizeShip(raw, index = 0) {
  const lat = Number(raw?.lat);
  const lng = Number(raw?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  return {
    id: raw?.id ? String(raw.id) : `SHIP_${index + 1}`,
    name: raw?.name ? String(raw.name) : "Unknown Ship",
    lat,
    lng,
    speed: Number.isFinite(Number(raw?.speed)) ? Number(raw.speed) : 0,
    heading: Number.isFinite(Number(raw?.heading)) ? Number(raw.heading) : 0,
    destination: raw?.destination ? String(raw.destination) : "Unknown",
    fuel: Number.isFinite(Number(raw?.fuel)) ? Number(raw.fuel) : 0,
    cargo: raw?.cargo ? String(raw.cargo) : "N/A",
    status: raw?.status ? String(raw.status) : "unknown",
    routeWaypoints: Array.isArray(raw?.routeWaypoints)
      ? raw.routeWaypoints
          .map((p) => ({ lat: Number(p?.lat), lng: Number(p?.lng) }))
          .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng))
      : [],
    fuelPerKm: Number.isFinite(Number(raw?.fuelPerKm)) ? Number(raw.fuelPerKm) : 0.04,
    distanceToDestinationKm: Number.isFinite(Number(raw?.distanceToDestinationKm))
      ? Number(raw.distanceToDestinationKm)
      : 0,
    insufficientFuel: !!raw?.insufficientFuel,
  };
}

function sanitizeFleetPayload(payload) {
  const rawShips = Array.isArray(payload?.ships) ? payload.ships : [];
  const ships = rawShips.map((s, i) => sanitizeShip(s, i)).filter(Boolean);

  return {
    ships,
    tick: Number.isFinite(Number(payload?.tick)) ? Number(payload.tick) : 0,
    serverTime: Number.isFinite(Number(payload?.serverTime))
      ? Number(payload.serverTime)
      : Date.now(),
  };
}

function countByStatus(ships) {
  return ships.reduce(
    (acc, ship) => {
      const key = ship.status || "unknown";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    },
    { normal: 0, rerouting: 0, distressed: 0, stopped: 0, arrived: 0 }
  );
}

function mergeUniqueById(existing, incoming) {
  const map = new Map(existing.map((item) => [item.id, item]));
  incoming.forEach((item) => {
    if (!item?.id) return;
    map.set(item.id, item);
  });
  return Array.from(map.values()).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

export default function App() {
  const [session, setSession] = useState(() => {
    const role = localStorage.getItem("role");
    const shipId = localStorage.getItem("shipId");
    return role ? { role, shipId } : null;
  });
  const [fleetData, setFleetData] = useState({
    ships: [],
    tick: 0,
    serverTime: Date.now(),
  });
  const [selectedShipId, setSelectedShipId] = useState(null);
  const [pendingDirectives, setPendingDirectives] = useState([]);
  const [directiveResponses, setDirectiveResponses] = useState([]);
  const [zones, setZones] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [weatherCells, setWeatherCells] = useState([]);
  const [playbackHistory, setPlaybackHistory] = useState([]);
  const [isPlaybackMode, setIsPlaybackMode] = useState(false);
  const [playbackTimestamp, setPlaybackTimestamp] = useState(null);
  const [playbackFleetData, setPlaybackFleetData] = useState(null);
  const [isDrawingZone, setIsDrawingZone] = useState(false);
  const [connectionState, setConnectionState] = useState("connecting");
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const beep = () => {
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = 880;
        gain.gain.value = 0.06;
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.12);
      } catch {
        // Audio may be blocked before first user interaction.
      }
    };

    const pushToast = (title, message) => {
      const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [{ id, title, message }, ...prev].slice(0, 5));
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3500);
    };

    const onFleetUpdate = (payload) => {
      const sanitized = sanitizeFleetPayload(payload);
      setFleetData(sanitized);
      setSelectedShipId((current) => current || sanitized.ships[0]?.id || null);
    };
    const onConnect = () => {
      setConnectionState("connected");
      pushToast("Connected", "Live fleet feed is active.");
    };
    const onDisconnect = () => {
      setConnectionState("disconnected");
      pushToast("Disconnected", "Trying to reconnect to backend.");
    };

    socket.on("fleet:update", onFleetUpdate);
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("directive:sent", (directive) => {
      setPendingDirectives((prev) => mergeUniqueById(prev, [directive]).slice(0, 100));
      pushToast(
        "Directive sent",
        `${directive.type} for ${directive.shipId}${directive.message ? `: ${directive.message}` : ""}`
      );
    });
    socket.on("directive:sync", (snapshot) => {
      const incomingPending = Array.isArray(snapshot?.pendingDirectives)
        ? snapshot.pendingDirectives
        : [];
      const incomingResponses = Array.isArray(snapshot?.directiveResponses)
        ? snapshot.directiveResponses
        : [];
      setPendingDirectives((prev) => mergeUniqueById(prev, incomingPending).slice(0, 100));
      setDirectiveResponses((prev) => mergeUniqueById(prev, incomingResponses).slice(0, 100));
    });
    socket.on("zone:sync", (payload) => {
      setZones(Array.isArray(payload?.zones) ? payload.zones : []);
    });
    socket.on("zone:added", (zone) => {
      setZones((prev) => mergeUniqueById(prev, [zone]).slice(0, 50));
      pushToast("Zone added", zone.id);
    });
    socket.on("zone:removed", ({ zoneId }) => {
      setZones((prev) => prev.filter((z) => z.id !== zoneId));
      pushToast("Zone removed", zoneId);
    });
    socket.on("alert:sync", (payload) => {
      setAlerts(Array.isArray(payload?.alerts) ? payload.alerts : []);
    });
    socket.on("alert:new", (alert) => {
      setAlerts((prev) => mergeUniqueById(prev, [alert]).slice(0, 300));
      if (alert.type === "DISTRESS") {
        pushToast("Distress analyzed", `${alert.shipId} - ${alert.severity} severity`);
      } else {
        pushToast("Geofence breach", `${alert.shipId} entered ${alert.zoneId}`);
      }
      beep();
    });
    socket.on("distress:analyzed", (alert) => {
      setAlerts((prev) => mergeUniqueById(prev, [alert]).slice(0, 300));
    });
    socket.on("alert:acked", ({ alertId, acknowledgedAt }) => {
      setAlerts((prev) =>
        prev.map((a) => (a.id === alertId ? { ...a, acknowledged: true, acknowledgedAt } : a))
      );
    });
    socket.on("directive:response", (response) => {
      setDirectiveResponses((prev) => mergeUniqueById(prev, [response]).slice(0, 100));
      setPendingDirectives((prev) =>
        prev.filter((d) => d.id !== response.directiveId)
      );
      pushToast("Captain response", `${response.shipId}: ${response.action}`);
    });

    return () => {
      socket.off("fleet:update", onFleetUpdate);
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("directive:sent");
      socket.off("directive:sync");
      socket.off("directive:response");
      socket.off("zone:sync");
      socket.off("zone:added");
      socket.off("zone:removed");
      socket.off("alert:sync");
      socket.off("alert:new");
      socket.off("distress:analyzed");
      socket.off("alert:acked");
    };
  }, []);

  useEffect(() => {
    const loadPlaybackHistory = async () => {
      try {
        const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";
        const res = await fetch(`${API_URL}/api/playback`);
        if (!res.ok) return;
        const data = await res.json();
        const snaps = Array.isArray(data?.snapshots) ? data.snapshots : [];
        setPlaybackHistory(snaps);
        if (snaps[0]?.timestamp && playbackTimestamp == null) {
          setPlaybackTimestamp(snaps[0].timestamp);
        }
      } catch {
        // ignore for now
      }
    };
    loadPlaybackHistory();
    const id = window.setInterval(loadPlaybackHistory, 30 * 1000);
    return () => window.clearInterval(id);
  }, [playbackTimestamp]);

  useEffect(() => {
    let active = true;
    const loadWeather = async () => {
      try {
        const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";
        const res = await fetch(`${API_URL}/api/weather`);
        if (!res.ok) return;
        const data = await res.json();
        if (!active) return;
        setWeatherCells(Array.isArray(data?.cells) ? data.cells : []);
      } catch {
        // ignore transient weather fetch errors
      }
    };
    loadWeather();
    const id = window.setInterval(loadWeather, 10 * 60 * 1000);
    return () => {
      active = false;
      window.clearInterval(id);
    };
  }, []);

  const activeFleetData = isPlaybackMode && playbackFleetData ? playbackFleetData : fleetData;
  const activeStats = useMemo(() => countByStatus(activeFleetData.ships), [activeFleetData.ships]);
  const selectedShip = useMemo(
    () => activeFleetData.ships.find((s) => s.id === selectedShipId) || null,
    [activeFleetData.ships, selectedShipId]
  );

  if (!session?.role) {
    return (
      <>
        <Login
          ships={fleetData.ships}
          onLogin={({ role, shipId }) => {
            const next = { role, shipId: shipId || null };
            setSession(next);
            localStorage.setItem("role", next.role);
            if (next.shipId) localStorage.setItem("shipId", next.shipId);
            if (next.role === "command" && fleetData.ships[0]?.id) {
              setSelectedShipId(fleetData.ships[0].id);
            } else {
              setSelectedShipId(next.shipId || null);
            }
          }}
        />
        <ToastStack toasts={toasts} />
      </>
    );
  }

  if (session.role === "captain") {
    const shipId = session.shipId || fleetData.ships[0]?.id || null;
    const pendingDirective =
      pendingDirectives.find((d) => d.shipId === shipId) || null;
    const hasRespondedToDirective = pendingDirective
      ? directiveResponses.some((r) => r.directiveId === pendingDirective.id)
      : false;

    return (
      <>
        <CaptainView
          fleetData={activeFleetData}
          shipId={shipId}
          pendingDirective={pendingDirective}
          hasRespondedToDirective={hasRespondedToDirective}
          connectionState={connectionState}
          zones={zones}
          weatherCells={weatherCells}
          onRespond={(payload) => {
            if (isPlaybackMode) return;
            socket.emit("directive:response", payload);
          }}
          onLogout={() => {
            setSession(null);
            localStorage.removeItem("role");
            localStorage.removeItem("shipId");
          }}
        />
        <Timeline
          history={playbackHistory}
          isPlaybackMode={isPlaybackMode}
          playbackTimestamp={playbackTimestamp}
          onScrub={async (ts) => {
            setPlaybackTimestamp(ts);
            setIsPlaybackMode(true);
            try {
              const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";
              const res = await fetch(`${API_URL}/api/playback/${ts}`);
              if (!res.ok) return;
              const data = await res.json();
              const snap = data?.snapshot;
              if (!snap) return;
              setPlaybackFleetData(sanitizeFleetPayload(snap));
            } catch {
              // ignore
            }
          }}
          onBackToLive={() => {
            setIsPlaybackMode(false);
            setPlaybackFleetData(null);
          }}
        />
        <ToastStack toasts={toasts} />
      </>
    );
  }

  return (
    <>
      <CommandView
        fleetData={activeFleetData}
        stats={activeStats}
        isPlaybackMode={isPlaybackMode}
        connectionState={connectionState}
        pendingDirectives={pendingDirectives}
        zones={zones}
        alerts={alerts}
        weatherCells={weatherCells}
        isDrawingZone={isDrawingZone}
        onStartDrawingZone={() => {
          if (isPlaybackMode) return;
          setIsDrawingZone(true);
        }}
        onFinishDrawingZone={() => setIsDrawingZone(false)}
        onCancelDrawingZone={() => setIsDrawingZone(false)}
        onAddZone={(coords) => {
          if (isPlaybackMode) return;
          socket.emit("zone:add", { coords });
        }}
        onRemoveZone={(zoneId) => {
          if (isPlaybackMode) return;
          socket.emit("zone:remove", { zoneId });
        }}
        onAcknowledgeAlert={(alertId) => {
          if (isPlaybackMode) return;
          socket.emit("alert:ack", { alertId });
        }}
        selectedShipId={selectedShipId}
        onSelectShip={setSelectedShipId}
        selectedShip={selectedShip}
        onSendDirective={(directive) => {
          if (isPlaybackMode) return;
          socket.emit("directive:send", {
            ...directive,
            from: "command",
            destinationLat: directive.destinationLat === "" ? undefined : Number(directive.destinationLat),
            destinationLng: directive.destinationLng === "" ? undefined : Number(directive.destinationLng),
          });
        }}
        directiveResponses={directiveResponses}
        onLogout={() => {
          setSession(null);
          localStorage.removeItem("role");
          localStorage.removeItem("shipId");
        }}
      />
      <Timeline
        history={playbackHistory}
        isPlaybackMode={isPlaybackMode}
        playbackTimestamp={playbackTimestamp}
        onScrub={async (ts) => {
          setPlaybackTimestamp(ts);
          setIsPlaybackMode(true);
          try {
            const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";
            const res = await fetch(`${API_URL}/api/playback/${ts}`);
            if (!res.ok) return;
            const data = await res.json();
            const snap = data?.snapshot;
            if (!snap) return;
            setPlaybackFleetData(sanitizeFleetPayload(snap));
          } catch {
            // ignore
          }
        }}
        onBackToLive={() => {
          setIsPlaybackMode(false);
          setPlaybackFleetData(null);
        }}
      />
      <ToastStack toasts={toasts} />
    </>
  );
}


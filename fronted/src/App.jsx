import { useEffect, useMemo, useState } from "react";
import socket from "./socket";
import Login from "./pages/Login";
import CommandView from "./pages/CommandView";
import CaptainView from "./pages/CaptainView";
import ToastStack from "./components/ToastStack";

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
  const [connectionState, setConnectionState] = useState("connecting");
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
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
    };
  }, []);

  const stats = useMemo(() => countByStatus(fleetData.ships), [fleetData.ships]);
  const selectedShip = useMemo(
    () => fleetData.ships.find((s) => s.id === selectedShipId) || null,
    [fleetData.ships, selectedShipId]
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
          fleetData={fleetData}
          shipId={shipId}
          pendingDirective={pendingDirective}
          hasRespondedToDirective={hasRespondedToDirective}
          connectionState={connectionState}
          onRespond={(payload) => socket.emit("directive:response", payload)}
          onLogout={() => {
            setSession(null);
            localStorage.removeItem("role");
            localStorage.removeItem("shipId");
          }}
        />
        <ToastStack toasts={toasts} />
      </>
    );
  }

  return (
    <>
      <CommandView
        fleetData={fleetData}
        stats={stats}
        connectionState={connectionState}
        pendingDirectives={pendingDirectives}
        selectedShipId={selectedShipId}
        onSelectShip={setSelectedShipId}
        selectedShip={selectedShip}
        onSendDirective={(directive) =>
          socket.emit("directive:send", {
            ...directive,
            from: "command",
            destinationLat: directive.destinationLat === "" ? undefined : Number(directive.destinationLat),
            destinationLng: directive.destinationLng === "" ? undefined : Number(directive.destinationLng),
          })
        }
        directiveResponses={directiveResponses}
        onLogout={() => {
          setSession(null);
          localStorage.removeItem("role");
          localStorage.removeItem("shipId");
        }}
      />
      <ToastStack toasts={toasts} />
    </>
  );
}


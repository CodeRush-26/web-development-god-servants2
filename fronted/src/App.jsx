import { useEffect, useMemo, useState } from "react";
import socket from "./socket";
import FleetMap from "./map/FleetMap";
import ShipList from "./components/ShipList";

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

export default function App() {
  const [fleetData, setFleetData] = useState({
    ships: [],
    tick: 0,
    serverTime: Date.now(),
  });
  const [selectedShipId, setSelectedShipId] = useState(null);

  useEffect(() => {
    const onFleetUpdate = (payload) => {
      const sanitized = sanitizeFleetPayload(payload);
      setFleetData(sanitized);
      setSelectedShipId((current) => current || sanitized.ships[0]?.id || null);
    };

    const pullSnapshot = async () => {
      try {
        const res = await fetch("http://localhost:4000/api/ships");
        if (!res.ok) return;
        const payload = await res.json();
        onFleetUpdate(payload);
      } catch {
        // ignore transient backend/network errors; socket may still recover
      }
    };

    pullSnapshot();
    const pollId = setInterval(pullSnapshot, 2000);

    socket.on("fleet:update", onFleetUpdate);
    socket.on("connect_error", () => {
      pullSnapshot();
    });

    return () => {
      clearInterval(pollId);
      socket.off("fleet:update", onFleetUpdate);
      socket.off("connect_error");
    };
  }, []);

  const stats = useMemo(() => countByStatus(fleetData.ships), [fleetData.ships]);
  const selectedShip = useMemo(
    () => fleetData.ships.find((s) => s.id === selectedShipId) || null,
    [fleetData.ships, selectedShipId]
  );

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "280px 1fr 280px",
        height: "100vh",
        fontFamily: "Inter, system-ui, sans-serif",
      }}
    >
      <aside style={{ borderRight: "1px solid #dbe2ea", background: "#f8fafc" }}>
        <ShipList
          ships={fleetData.ships}
          selectedShipId={selectedShipId}
          onSelectShip={setSelectedShipId}
        />
      </aside>

      <main style={{ minWidth: 0 }}>
        <FleetMap
          fleetData={fleetData}
          selectedShipId={selectedShipId}
          onSelectShip={setSelectedShipId}
        />
      </main>

      <aside
        style={{
          borderLeft: "1px solid #dbe2ea",
          background: "#f8fafc",
          padding: 12,
          fontSize: 14,
        }}
      >
        <h3 style={{ marginTop: 0 }}>Command</h3>
        <div style={{ marginBottom: 8 }}>Tick: {fleetData.tick}</div>
        <div style={{ marginBottom: 12 }}>
          Updated: {new Date(fleetData.serverTime).toLocaleTimeString()}
        </div>

        <h4 style={{ margin: "0 0 8px" }}>Fleet Status</h4>
        <div>Normal: {stats.normal || 0}</div>
        <div>Rerouting: {stats.rerouting || 0}</div>
        <div>Distressed: {stats.distressed || 0}</div>
        <div>Stopped: {stats.stopped || 0}</div>
        <div>Arrived: {stats.arrived || 0}</div>

        <h4 style={{ margin: "16px 0 8px" }}>Active Ship</h4>
        {selectedShip ? (
          <div style={{ lineHeight: 1.5 }}>
            <div>
              <strong>{selectedShip.name}</strong>
            </div>
            <div>{selectedShip.id}</div>
            <div>Speed: {selectedShip.speed} kn</div>
            <div>Heading: {Math.round(selectedShip.heading)}°</div>
            <div>Fuel: {Number(selectedShip.fuel ?? 0).toFixed(1)}%</div>
            <div>Status: {selectedShip.status}</div>
          </div>
        ) : (
          <div>No ship selected</div>
        )}
      </aside>
    </div>
  );
}


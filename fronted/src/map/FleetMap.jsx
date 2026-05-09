import { useMemo } from "react";

function statusColor(status) {
  switch (status) {
    case "normal":
      return "#14b86a";
    case "rerouting":
      return "#f0b429";
    case "distressed":
      return "#e55353";
    case "stopped":
      return "#8f8f8f";
    case "arrived":
      return "#3b82f6";
    default:
      return "#94a3b8";
  }
}

export default function FleetMap({ fleetData, selectedShipId, onSelectShip }) {
  const markers = useMemo(() => {
    const ships = Array.isArray(fleetData?.ships) ? fleetData.ships : [];
    return ships.filter(
      (ship) =>
        ship &&
        Number.isFinite(ship.lat) &&
        Number.isFinite(ship.lng) &&
        typeof ship.id === "string"
    );
  }, [fleetData?.ships]);

  return (
    <div
      style={{
        height: "100vh",
        width: "100%",
        background: "#f1f5f9",
        padding: 12,
        overflow: "auto",
      }}
    >
      <div
        style={{
          marginBottom: 10,
          background: "#fff",
          border: "1px solid #dbe2ea",
          borderRadius: 8,
          padding: 10,
        }}
      >
        <strong>Live Fleet Coordinates</strong>
        <div style={{ marginTop: 4, color: "#475569", fontSize: 13 }}>
          Map temporarily disabled to prevent Leaflet runtime crashes.
        </div>
      </div>

      {markers.map((ship) => {
        const active = ship.id === selectedShipId;
        return (
          <button
            type="button"
            key={ship.id}
            onClick={() => onSelectShip?.(ship.id)}
            style={{
              width: "100%",
              border: active ? "1px solid #2563eb" : "1px solid #dbe2ea",
              background: active ? "#eff6ff" : "#fff",
              borderRadius: 8,
              padding: "10px 12px",
              marginBottom: 8,
              textAlign: "left",
              cursor: "pointer",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <div style={{ fontWeight: 600 }}>{ship.name}</div>
              <div style={{ fontSize: 12, color: "#475569" }}>
                {ship.id} | {ship.lat.toFixed(4)}, {ship.lng.toFixed(4)}
              </div>
            </div>
            <span
              style={{
                background: statusColor(ship.status),
                color: "#fff",
                borderRadius: 8,
                fontSize: 12,
                padding: "2px 8px",
                textTransform: "capitalize",
              }}
            >
              {ship.status}
            </span>
          </button>
        );
      })}

      {markers.length === 0 ? (
        <div
          style={{
            background: "#fff",
            border: "1px solid #dbe2ea",
            borderRadius: 8,
            padding: 12,
            color: "#64748b",
          }}
        >
          No valid ship coordinates received yet.
        </div>
      ) : null}
    </div>
  );
}


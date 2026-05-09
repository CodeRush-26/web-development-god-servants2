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

export default function ShipList({ ships, selectedShipId, onSelectShip }) {
  return (
    <div style={{ padding: 12 }}>
      <h3 style={{ marginTop: 0, marginBottom: 10 }}>Fleet</h3>
      <div style={{ maxHeight: "calc(100vh - 120px)", overflowY: "auto" }}>
        {ships.map((ship) => {
          const active = ship.id === selectedShipId;
          return (
            <button
              type="button"
              key={ship.id}
              onClick={() => onSelectShip?.(ship.id)}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 8,
                textAlign: "left",
                border: active ? "1px solid #2563eb" : "1px solid #e5e7eb",
                background: active ? "#eff6ff" : "#fff",
                borderRadius: 8,
                padding: "8px 10px",
                marginBottom: 8,
                cursor: "pointer",
              }}
            >
              <span
                style={{
                  width: 9,
                  height: 9,
                  borderRadius: "50%",
                  background: statusColor(ship.status),
                  flex: "0 0 auto",
                }}
              />
              <span style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{ship.name}</div>
                <div style={{ fontSize: 12, color: "#475569" }}>
                  {ship.destination} | {Math.round(ship.fuel)}% fuel
                </div>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}


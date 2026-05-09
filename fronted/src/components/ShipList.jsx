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
    <div style={{ display: "flex", flexDirection: "column", gap: "8px", paddingBottom: "20px" }}>
      {ships.map((ship) => {
        const active = ship.id === selectedShipId;
        return (
          <button
            type="button"
            key={ship.id}
            onClick={() => onSelectShip?.(ship.id)}
            className={`ship-row${active ? " active" : ""}`}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "12px",
              border: `1px solid ${active ? "#3b82f6" : "#334155"}`,
              borderRadius: "8px",
              background: active ? "rgba(59, 130, 246, 0.1)" : "#1e293b",
              color: active ? "#f8fafc" : "#e2e8f0",
              cursor: "pointer",
              textAlign: "left",
              transition: "all 0.2s ease"
            }}
          >
            <span
              className="ship-dot"
              style={{
                background: statusColor(ship.status),
                width: "10px",
                height: "10px",
                borderRadius: "50%",
                flexShrink: 0
              }}
            />
            <span style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{ship.name}</div>
              <div style={{ fontSize: 11, color: active ? "#cbd5e1" : "#94a3b8", marginTop: "2px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {ship.destination} | {Math.round(ship.fuel)}% fuel
              </div>
            </span>
          </button>
        );
      })}
    </div>
  );
}

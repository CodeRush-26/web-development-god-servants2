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
    <div className="fleet-wrap">
      <h3 style={{ marginTop: 0, marginBottom: 10 }}>Fleet</h3>
      <div className="fleet-scroll">
        {ships.map((ship) => {
          const active = ship.id === selectedShipId;
          return (
            <button
              type="button"
              key={ship.id}
              onClick={() => onSelectShip?.(ship.id)}
              className={`ship-row${active ? " active" : ""}`}
            >
              <span
                className="ship-dot"
                style={{ background: statusColor(ship.status) }}
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


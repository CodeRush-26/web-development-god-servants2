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

export default function ShipTooltip({ ship }) {
  const fuel = Math.max(0, Math.min(100, Number(ship.fuel ?? 0)));

  return (
    <div style={{ minWidth: 220, fontFamily: "Inter, system-ui, sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        <strong>{ship.name}</strong>
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
      </div>
      <div style={{ fontSize: 13, marginBottom: 6 }}>
        <div>ID: {ship.id}</div>
        <div>Speed: {ship.speed?.toFixed?.(1) ?? ship.speed} kn</div>
        <div>Heading: {Math.round(ship.heading)}°</div>
        <div>Destination: {ship.destination}</div>
        <div>Cargo: {ship.cargo}</div>
      </div>
      <div style={{ fontSize: 12, marginBottom: 4 }}>Fuel: {fuel.toFixed(1)}%</div>
      <div
        style={{
          background: "#e5e7eb",
          borderRadius: 10,
          height: 8,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${fuel}%`,
            height: "100%",
            background: fuel > 25 ? "#14b86a" : "#e55353",
          }}
        />
      </div>
    </div>
  );
}


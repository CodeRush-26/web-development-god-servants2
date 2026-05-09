export default function ShipDetail({ ship }) {
  if (!ship) {
    return <div className="dashboard-card" style={{ marginTop: 12, color: "#94a3b8" }}>Select a ship to view route and fuel estimate.</div>;
  }

  const fuelRemaining = Number(ship.fuel || 0);
  const fuelPerKm = Number(ship.fuelPerKm || 0.04);
  const distanceKm = Number(ship.distanceToDestinationKm || 0);
  const fuelRange = fuelPerKm > 0 ? fuelRemaining / fuelPerKm : 0;
  const short = fuelRange + 0.1 < distanceKm;

  return (
    <div className="dashboard-card" style={{ marginTop: 12 }}>
      <div className="dashboard-card-title">Ship Detail</div>
      <div style={{ lineHeight: 1.6, fontSize: 13, color: "#cbd5e1" }}>
        <div style={{ marginBottom: 4 }}>
          <strong style={{ color: "#f8fafc", fontSize: 15 }}>{ship.name}</strong> <span style={{ color: "#64748b" }}>({ship.id})</span>
        </div>
        <div><strong>Status:</strong> <span style={{ color: "#38bdf8" }}>{ship.status}</span></div>
        <div><strong>Destination:</strong> {ship.destination}</div>
        <div><strong>Distance:</strong> {distanceKm.toFixed(1)} km</div>
        <div><strong>Fuel remaining:</strong> {fuelRemaining.toFixed(1)} %</div>
        <div><strong>Fuel/km estimate:</strong> {fuelPerKm.toFixed(3)} %/km</div>
        <div><strong>Estimated range:</strong> {fuelRange.toFixed(1)} km</div>
      </div>
      <div
        style={{
          marginTop: 12,
          padding: "8px 10px",
          borderRadius: 8,
          background: short ? "rgba(239, 68, 68, 0.1)" : "rgba(16, 185, 129, 0.1)",
          border: `1px solid ${short ? "rgba(239, 68, 68, 0.3)" : "rgba(16, 185, 129, 0.3)"}`,
          color: short ? "#fca5a5" : "#6ee7b7",
          fontSize: 12,
          fontWeight: 600,
          textAlign: "center"
        }}
      >
        {short ? "Warning: insufficient fuel for destination" : "Fuel estimate looks sufficient"}
      </div>
    </div>
  );
}

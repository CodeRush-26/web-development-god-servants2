export default function ShipDetail({ ship }) {
  if (!ship) {
    return <div className="card muted">Select a ship to view route and fuel estimate.</div>;
  }

  const fuelRemaining = Number(ship.fuel || 0);
  const fuelPerKm = Number(ship.fuelPerKm || 0.04);
  const distanceKm = Number(ship.distanceToDestinationKm || 0);
  const fuelRange = fuelPerKm > 0 ? fuelRemaining / fuelPerKm : 0;
  const short = fuelRange + 0.1 < distanceKm;

  return (
    <div className="card" style={{ marginTop: 12 }}>
      <h4 style={{ marginTop: 0, marginBottom: 8 }}>Ship Detail</h4>
      <div className="small" style={{ lineHeight: 1.6 }}>
        <div>
          <strong>{ship.name}</strong> ({ship.id})
        </div>
        <div>Status: {ship.status}</div>
        <div>Destination: {ship.destination}</div>
        <div>Distance to destination: {distanceKm.toFixed(1)} km</div>
        <div>Fuel remaining: {fuelRemaining.toFixed(1)} %</div>
        <div>Fuel/km estimate: {fuelPerKm.toFixed(3)} %/km</div>
        <div>Estimated range: {fuelRange.toFixed(1)} km</div>
      </div>
      <div
        style={{
          marginTop: 10,
          padding: "8px 10px",
          borderRadius: 8,
          background: short ? "#fee2e2" : "#dcfce7",
          color: short ? "#991b1b" : "#166534",
          fontSize: 12,
          fontWeight: 600,
        }}
      >
        {short ? "Warning: insufficient fuel for destination" : "Fuel estimate looks sufficient"}
      </div>
    </div>
  );
}

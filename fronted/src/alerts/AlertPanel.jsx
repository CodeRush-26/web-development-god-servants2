export default function AlertPanel({ alerts, onAcknowledge }) {
  const active = (alerts || []).filter((a) => !a.acknowledged);
  const recent = (alerts || []).slice(0, 20);

  return (
    <div className="card" style={{ marginTop: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <h4 style={{ margin: 0 }}>Alerts</h4>
        <span className={`chip ${active.length ? "chip-bad" : ""}`}>
          Active: {active.length}
        </span>
      </div>
      <div style={{ maxHeight: 220, overflowY: "auto", fontSize: 12 }}>
        {recent.map((alert) => (
          <div
            key={alert.id}
            style={{
              border: "1px solid #e2e8f0",
              borderLeft: `4px solid ${alert.acknowledged ? "#94a3b8" : "#ef4444"}`,
              borderRadius: 8,
              padding: 8,
              marginBottom: 8,
              background: alert.acknowledged ? "#f8fafc" : "#fff5f5",
            }}
          >
            <div style={{ fontWeight: 600 }}>{alert.type}</div>
            <div>{alert.message}</div>
            <div style={{ color: "#475569", marginTop: 4 }}>
              {new Date(alert.createdAt).toLocaleTimeString()}
            </div>
            {!alert.acknowledged ? (
              <button
                type="button"
                onClick={() => onAcknowledge?.(alert.id)}
                style={{ marginTop: 6, width: "100%" }}
              >
                Acknowledge
              </button>
            ) : null}
          </div>
        ))}
        {recent.length === 0 ? <div style={{ color: "#64748b" }}>No alerts yet.</div> : null}
      </div>
    </div>
  );
}

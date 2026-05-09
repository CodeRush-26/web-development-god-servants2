import DistressCard from "./DistressCard";

function priority(alert) {
  if (alert.type === "DISTRESS") {
    if (alert.severity === "HIGH") return 100;
    if (alert.severity === "MED") return 80;
    return 60;
  }
  if (alert.type === "GEOFENCE_BREACH" && !alert.acknowledged) return 50;
  if (alert.type === "PROXIMITY_WARNING") return 40;
  return 10;
}

export default function AlertPanel({ alerts, onAcknowledge }) {
  const active = (alerts || []).filter((a) => !a.acknowledged);
  const recent = (alerts || [])
    .slice()
    .sort((a, b) => {
      const p = priority(b) - priority(a);
      if (p !== 0) return p;
      return (b.createdAt || 0) - (a.createdAt || 0);
    })
    .slice(0, 20);

  return (
    <div className="dashboard-card" style={{ marginTop: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div className="dashboard-card-title" style={{ margin: 0 }}>Alerts</div>
        <span className={`status-indicator ${active.length ? "warn" : "ok"}`}>
          Active: {active.length}
        </span>
      </div>
      <div style={{ maxHeight: 220, overflowY: "auto", fontSize: 12 }}>
        {recent.map((alert) =>
          alert.type === "DISTRESS" ? (
            <DistressCard key={alert.id} alert={alert} onAcknowledge={onAcknowledge} />
          ) : (
            <div
              key={alert.id}
              style={{
                border: "1px solid #334155",
                borderLeft: `4px solid ${alert.acknowledged ? "#475569" : "#ef4444"}`,
                borderRadius: 8,
                padding: 8,
                marginBottom: 8,
                background: alert.acknowledged ? "#1e293b" : "rgba(239, 68, 68, 0.1)",
              }}
            >
              <div style={{ fontWeight: 600, color: alert.acknowledged ? "#94a3b8" : "#fca5a5" }}>{alert.type}</div>
              <div style={{ color: "#e2e8f0" }}>{alert.message}</div>
              <div style={{ color: "#64748b", marginTop: 4 }}>
                {new Date(alert.createdAt).toLocaleTimeString()}
              </div>
              {!alert.acknowledged ? (
                <button
                  type="button"
                  className="dashboard-btn danger"
                  onClick={() => onAcknowledge?.(alert.id)}
                  style={{ marginTop: 6, width: "100%", padding: "6px" }}
                >
                  Acknowledge
                </button>
              ) : null}
            </div>
          )
        )}
        {recent.length === 0 ? <div style={{ color: "#64748b", fontStyle: "italic" }}>No alerts yet.</div> : null}
      </div>
    </div>
  );
}

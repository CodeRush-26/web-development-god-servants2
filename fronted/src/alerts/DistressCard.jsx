function severityColor(severity) {
  if (severity === "HIGH") return { bg: "rgba(239, 68, 68, 0.15)", fg: "#fca5a5", border: "#ef4444" };
  if (severity === "MED") return { bg: "rgba(245, 158, 11, 0.15)", fg: "#fcd34d", border: "#f59e0b" };
  return { bg: "rgba(16, 185, 129, 0.15)", fg: "#6ee7b7", border: "#10b981" };
}

export default function DistressCard({ alert, onAcknowledge }) {
  const palette = severityColor(alert.severity);
  return (
    <div
      style={{
        border: `1px solid ${alert.acknowledged ? "#334155" : palette.border}`,
        borderLeft: `5px solid ${alert.acknowledged ? "#475569" : palette.border}`,
        borderRadius: 8,
        padding: 10,
        marginBottom: 8,
        background: alert.acknowledged ? "#1e293b" : palette.bg,
        animation: alert.severity === "HIGH" && !alert.acknowledged ? "pulse-border 1.2s infinite" : "none",
        color: "#e2e8f0"
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <strong style={{ color: alert.acknowledged ? "#94a3b8" : "#f8fafc" }}>DISTRESS - {alert.shipId}</strong>
        <span style={{ fontSize: 11, fontWeight: 700, color: alert.acknowledged ? "#64748b" : palette.fg, background: "rgba(0,0,0,0.2)", padding: "2px 6px", borderRadius: 4 }}>{alert.severity}</span>
      </div>
      <div style={{ fontSize: 11, marginBottom: 8 }}>
        <span
          style={{
            border: "1px solid #334155",
            borderRadius: 999,
            padding: "2px 8px",
            background: "#0f172a",
            color: "#94a3b8",
            fontWeight: 600,
          }}
        >
          AI: {String(alert.aiSource || "fallback").toUpperCase()}
          {alert.aiModel ? ` (${alert.aiModel})` : ""}
        </span>
      </div>
      <div style={{ fontSize: 12, marginBottom: 4, color: "#cbd5e1" }}>
        <strong style={{ color: "#94a3b8" }}>Issue:</strong> {alert.issueType} | <strong style={{ color: "#94a3b8" }}>Injuries:</strong> {alert.injuryCount}
      </div>
      <div style={{ fontSize: 12, marginBottom: 4, color: "#cbd5e1" }}>
        <strong style={{ color: "#94a3b8" }}>Damage:</strong> {alert.damageEstimate}
      </div>
      <div style={{ fontSize: 12, marginBottom: 6, color: "#cbd5e1" }}>
        <strong style={{ color: "#94a3b8" }}>Action:</strong> {alert.recommendedAction}
      </div>
      <div style={{ fontSize: 12, fontStyle: "italic", marginBottom: 8, color: "#64748b" }}>{alert.message}</div>
      {!alert.acknowledged ? (
        <button 
          type="button" 
          className="dashboard-btn"
          onClick={() => onAcknowledge?.(alert.id)} 
          style={{ width: "100%", padding: "6px", background: palette.border }}
        >
          Acknowledge Distress
        </button>
      ) : null}
    </div>
  );
}

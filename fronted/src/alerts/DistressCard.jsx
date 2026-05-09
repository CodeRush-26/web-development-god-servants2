function severityColor(severity) {
  if (severity === "HIGH") return { bg: "#fee2e2", fg: "#991b1b", border: "#ef4444" };
  if (severity === "MED") return { bg: "#fef3c7", fg: "#92400e", border: "#f59e0b" };
  return { bg: "#dcfce7", fg: "#166534", border: "#22c55e" };
}

export default function DistressCard({ alert, onAcknowledge }) {
  const palette = severityColor(alert.severity);
  return (
    <div
      style={{
        border: `1px solid ${palette.border}`,
        borderLeft: `5px solid ${palette.border}`,
        borderRadius: 8,
        padding: 8,
        marginBottom: 8,
        background: palette.bg,
        animation: alert.severity === "HIGH" && !alert.acknowledged ? "pulse-border 1.2s infinite" : "none",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <strong>DISTRESS - {alert.shipId}</strong>
        <span style={{ fontSize: 11, fontWeight: 700, color: palette.fg }}>{alert.severity}</span>
      </div>
      <div style={{ fontSize: 11, marginBottom: 6 }}>
        <span
          style={{
            border: "1px solid #cbd5e1",
            borderRadius: 999,
            padding: "2px 8px",
            background: "#f8fafc",
            color: "#334155",
            fontWeight: 600,
          }}
        >
          AI: {String(alert.aiSource || "fallback").toUpperCase()}
          {alert.aiModel ? ` (${alert.aiModel})` : ""}
        </span>
      </div>
      <div style={{ fontSize: 12, marginBottom: 4 }}>
        <strong>Issue:</strong> {alert.issueType} | <strong>Injuries:</strong> {alert.injuryCount}
      </div>
      <div style={{ fontSize: 12, marginBottom: 4 }}>
        <strong>Damage:</strong> {alert.damageEstimate}
      </div>
      <div style={{ fontSize: 12, marginBottom: 4 }}>
        <strong>Action:</strong> {alert.recommendedAction}
      </div>
      <div style={{ fontSize: 12, fontStyle: "italic", marginBottom: 4 }}>{alert.message}</div>
      {!alert.acknowledged ? (
        <button type="button" onClick={() => onAcknowledge?.(alert.id)} style={{ width: "100%" }}>
          Acknowledge
        </button>
      ) : null}
    </div>
  );
}

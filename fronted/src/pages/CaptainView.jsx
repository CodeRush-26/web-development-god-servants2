import { useMemo, useState } from "react";
import FleetMap from "../map/FleetMap";

export default function CaptainView({
  fleetData,
  shipId,
  pendingDirective,
  hasRespondedToDirective,
  connectionState,
  zones,
  weatherCells,
  onRespond,
  onLogout,
}) {
  const [distress, setDistress] = useState("");
  const ship = useMemo(() => fleetData.ships.find((s) => s.id === shipId) || null, [fleetData.ships, shipId]);
  const singleFleetData = useMemo(
    () => ({
      ...fleetData,
      ships: ship ? [ship] : [],
    }),
    [fleetData, ship]
  );

  return (
    <div className="app-grid-2" style={{ gridTemplateColumns: "1fr 380px" }}>
      <main style={{ minWidth: 0 }}>
        <FleetMap
          fleetData={singleFleetData}
          selectedShipId={shipId}
          onSelectShip={() => {}}
          weatherCells={weatherCells}
          zones={zones}
          role="captain"
        />
      </main>
      <aside className="dashboard-sidebar panel-right">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 22, color: "#f8fafc", display: "flex", alignItems: "center", gap: 8 }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>
            </svg>
            Captain
          </h2>
          <button type="button" onClick={onLogout} className="dashboard-btn" style={{ width: "auto", padding: "6px 12px", background: "transparent", border: "1px solid #334155", color: "#94a3b8" }}>
            Logout
          </button>
        </div>

        <div className="dashboard-card">
          <div className="dashboard-card-title">Vessel Status</div>
          <div style={{ marginBottom: 12 }}>
            Ship Name: <strong style={{ color: "#f8fafc", fontSize: 16 }}>{ship?.name || shipId}</strong>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <span className={`status-indicator ${connectionState === "connected" ? "ok" : "warn"}`}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "currentColor" }} />
              {connectionState}
            </span>
            <span className="status-indicator">
              Fuel: {ship ? Math.round(ship.fuel) : 0}%
            </span>
          </div>
        </div>

        {pendingDirective ? (
          <div className={`dashboard-card ${!hasRespondedToDirective ? "pulsing-alert" : ""}`} style={{ borderColor: hasRespondedToDirective ? "#334155" : "#ef4444" }}>
            <div className="dashboard-card-title" style={{ color: hasRespondedToDirective ? "#94a3b8" : "#fca5a5" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
              Incoming Directive
            </div>
            
            <div style={{ padding: "12px", background: "#0f172a", borderRadius: "8px", border: "1px solid #1e293b", marginBottom: "16px" }}>
              <div style={{ fontSize: 11, color: "#94a3b8", textTransform: "uppercase", marginBottom: 4 }}>Type: {pendingDirective.type}</div>
              <div style={{ fontSize: 14, color: "#f8fafc" }}>{pendingDirective.message || "Please check route modifications."}</div>
            </div>

            <button
              type="button"
              disabled={hasRespondedToDirective}
              onClick={() =>
                onRespond?.({
                  shipId,
                  action: "ACCEPT",
                  message: "Captain accepted directive",
                  directiveId: pendingDirective.id,
                  directive: pendingDirective,
                })
              }
              className="dashboard-btn"
              style={{ marginBottom: 16, background: hasRespondedToDirective ? "#334155" : "#10b981", color: "#fff" }}
            >
              {hasRespondedToDirective ? (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  ACCEPTED
                </>
              ) : (
                "Acknowledge & Accept"
              )}
            </button>

            <div style={{ borderTop: "1px solid #334155", paddingTop: 16 }}>
              <div style={{ fontSize: 13, color: "#94a3b8", marginBottom: 8 }}>Unable to comply? Escalate distress:</div>
              <textarea
                className="dashboard-input"
                placeholder="State reason for distress..."
                value={distress}
                onChange={(e) => setDistress(e.target.value)}
                rows={3}
                style={{ marginBottom: 12, resize: "vertical" }}
              />
              <button
                type="button"
                disabled={hasRespondedToDirective}
                onClick={() =>
                  onRespond?.({
                    shipId,
                    action: "ESCALATE_DISTRESS",
                    message: distress || "Captain escalated distress",
                    directiveId: pendingDirective.id,
                    directive: pendingDirective,
                  })
                }
                className="dashboard-btn danger"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                {hasRespondedToDirective ? "RESPONSE LOGGED" : "Escalate Distress"}
              </button>
            </div>
          </div>
        ) : (
          <div className="dashboard-card" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 20px", color: "#64748b", borderStyle: "dashed" }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" style={{ marginBottom: 16, opacity: 0.5 }}>
              <circle cx="12" cy="12" r="10"></circle><path d="M12 8v4l3 3"></path>
            </svg>
            No Pending Directives
          </div>
        )}
      </aside>
    </div>
  );
}

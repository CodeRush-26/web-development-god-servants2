import { useMemo, useState } from "react";
import FleetMap from "../map/FleetMap";

export default function CaptainView({
  fleetData,
  shipId,
  pendingDirective,
  hasRespondedToDirective,
  connectionState,
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
    <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", height: "100vh" }}>
      <main style={{ minWidth: 0 }}>
        <FleetMap fleetData={singleFleetData} selectedShipId={shipId} onSelectShip={() => {}} />
      </main>
      <aside style={{ borderLeft: "1px solid #dbe2ea", background: "#f8fafc", padding: 12, fontSize: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0 }}>Captain</h3>
          <button type="button" onClick={onLogout} style={{ border: "1px solid #cbd5e1", borderRadius: 6 }}>
            Logout
          </button>
        </div>
        <div style={{ margin: "8px 0 12px", color: "#475569" }}>
          Ship: <strong>{ship?.name || shipId}</strong>
        </div>
        <div style={{ marginBottom: 12, fontSize: 12 }}>
          <span
            style={{
              padding: "2px 8px",
              borderRadius: 999,
              background: connectionState === "connected" ? "#dcfce7" : "#fee2e2",
              color: connectionState === "connected" ? "#166534" : "#991b1b",
            }}
          >
            Socket: {connectionState}
          </span>
        </div>

        {pendingDirective ? (
          <div style={{ border: "1px solid #cbd5e1", borderRadius: 8, padding: 10 }}>
            <h4 style={{ marginTop: 0 }}>Incoming Directive</h4>
            <div style={{ fontSize: 12, marginBottom: 4 }}>Type: {pendingDirective.type}</div>
            <div style={{ fontSize: 13, marginBottom: 8 }}>{pendingDirective.message || "(no message)"}</div>
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
              style={{ width: "100%", marginBottom: 8, padding: "8px 10px" }}
            >
              {hasRespondedToDirective ? "ACCEPTED" : "ACCEPT"}
            </button>
            <textarea
              placeholder="Distress message (free-form)"
              value={distress}
              onChange={(e) => setDistress(e.target.value)}
              rows={4}
              style={{ width: "100%", marginBottom: 8 }}
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
              style={{ width: "100%", padding: "8px 10px" }}
            >
              {hasRespondedToDirective ? "RESPONSE SENT" : "ESCALATE_DISTRESS"}
            </button>
          </div>
        ) : (
          <div style={{ border: "1px solid #cbd5e1", borderRadius: 8, padding: 10, color: "#64748b" }}>
            No pending directives.
          </div>
        )}
      </aside>
    </div>
  );
}

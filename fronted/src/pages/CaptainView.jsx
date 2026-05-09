import { useMemo, useState } from "react";
import FleetMap from "../map/FleetMap";

export default function CaptainView({
  fleetData,
  shipId,
  pendingDirective,
  hasRespondedToDirective,
  connectionState,
  zones,
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
    <div className="app-grid-2">
      <main style={{ minWidth: 0 }}>
        <FleetMap
          fleetData={singleFleetData}
          selectedShipId={shipId}
          onSelectShip={() => {}}
          zones={zones}
          role="captain"
        />
      </main>
      <aside className="panel panel-right">
        <div className="panel-title-row">
          <h3 className="panel-title">Captain</h3>
          <button type="button" onClick={onLogout}>
            Logout
          </button>
        </div>
        <div className="muted" style={{ margin: "8px 0 12px" }}>
          Ship: <strong>{ship?.name || shipId}</strong>
        </div>
        <div className="chip-row" style={{ marginBottom: 12 }}>
          <span
            className={`chip ${connectionState === "connected" ? "chip-ok" : "chip-bad"}`}
          >
            Socket: {connectionState}
          </span>
        </div>

        {pendingDirective ? (
          <div className="card">
            <h4 style={{ marginTop: 0 }}>Incoming Directive</h4>
            <div className="small muted" style={{ marginBottom: 4 }}>Type: {pendingDirective.type}</div>
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
              className="btn-primary"
              style={{ width: "100%", marginBottom: 8 }}
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
              className="btn-primary"
              style={{ width: "100%" }}
            >
              {hasRespondedToDirective ? "RESPONSE SENT" : "ESCALATE_DISTRESS"}
            </button>
          </div>
        ) : (
          <div className="card muted">
            No pending directives.
          </div>
        )}
      </aside>
    </div>
  );
}

import { useMemo, useState } from "react";
import FleetMap from "../map/FleetMap";
import ShipList from "../components/ShipList";
import AlertPanel from "../alerts/AlertPanel";
import ShipDetail from "../components/ShipDetail";

export default function CommandView({
  fleetData,
  stats,
  isPlaybackMode,
  connectionState,
  pendingDirectives,
  selectedShipId,
  onSelectShip,
  onSendDirective,
  directiveResponses,
  alerts,
  zones,
  isDrawingZone,
  onStartDrawingZone,
  onFinishDrawingZone,
  onCancelDrawingZone,
  onAddZone,
  onRemoveZone,
  onAcknowledgeAlert,
  onLogout,
  weatherCells,
}) {
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [form, setForm] = useState({
    type: "REROUTE",
    message: "",
    destinationName: "",
    destinationLat: "",
    destinationLng: "",
  });

  const selectedShip = useMemo(
    () => fleetData.ships.find((s) => s.id === selectedShipId) || null,
    [fleetData.ships, selectedShipId]
  );

  return (
    <div
      className="app-grid-3"
      style={{
        gridTemplateColumns: `${leftCollapsed ? "54px" : "320px"} 1fr ${rightCollapsed ? "54px" : "340px"}`,
        transition: "grid-template-columns 250ms cubic-bezier(0.4, 0, 0.2, 1)",
      }}
    >
      <aside className="dashboard-sidebar panel-left" style={{ overflow: "hidden", position: "relative", display: "flex", flexDirection: "column" }}>
        <button
          type="button"
          onClick={() => setLeftCollapsed((v) => !v)}
          className="panel-toggle-btn"
          style={{ right: 12, top: 16 }}
          title={leftCollapsed ? "Expand fleet" : "Collapse fleet"}
        >
          {leftCollapsed ? ">" : "<"}
        </button>
        {!leftCollapsed ? (
          <>
            <div style={{ padding: "20px 20px 10px" }}>
              <h3 style={{ margin: 0, fontSize: 18, color: "#f8fafc" }}>Fleet Overview</h3>
              <p style={{ color: "#94a3b8", fontSize: 12, margin: "4px 0 0" }}>Active Vessels: {fleetData.ships.length}</p>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "0 10px" }}>
              <ShipList ships={fleetData.ships} selectedShipId={selectedShipId} onSelectShip={onSelectShip} />
            </div>
          </>
        ) : (
          <div
            className="collapsed-label"
            style={{ padding: 10, writingMode: "vertical-rl", marginInline: "auto", background: "transparent", color: "#f8fafc", textShadow: "none", border: "none", boxShadow: "none" }}
          >
            FLEET
          </div>
        )}
      </aside>

      <main style={{ minWidth: 0, position: "relative" }}>
        <FleetMap
          fleetData={fleetData}
          selectedShipId={selectedShipId}
          onSelectShip={onSelectShip}
          weatherCells={weatherCells}
          zones={zones}
          role={isPlaybackMode ? "captain" : "command"}
          isDrawingZone={isDrawingZone}
          onStartDrawingZone={onStartDrawingZone}
          onFinishDrawingZone={onFinishDrawingZone}
          onCancelDrawingZone={onCancelDrawingZone}
          onAddZone={onAddZone}
          onRemoveZone={onRemoveZone}
        />
      </main>

      <aside
        className="dashboard-sidebar panel-right"
        style={{
          overflowX: "hidden",
          overflowY: rightCollapsed ? "hidden" : "auto",
        }}
      >
        <button
          type="button"
          onClick={() => setRightCollapsed((v) => !v)}
          className="panel-toggle-btn"
          style={{ left: -14, top: 16 }}
          title={rightCollapsed ? "Expand command panel" : "Collapse command panel"}
        >
          {rightCollapsed ? "<" : ">"}
        </button>
        {!rightCollapsed ? (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 22, color: "#f8fafc", display: "flex", alignItems: "center", gap: 8 }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>
                Command
              </h2>
              <button type="button" onClick={onLogout} className="dashboard-btn" style={{ width: "auto", padding: "6px 12px", background: "transparent", border: "1px solid #334155", color: "#94a3b8" }}>
                Logout
              </button>
            </div>

            <div className="dashboard-card">
              <div className="dashboard-card-title">System Status</div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
                <span className={`status-indicator ${connectionState === "connected" ? "ok" : "warn"}`}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: "currentColor" }} />
                  {connectionState}
                </span>
                <span className="status-indicator">
                  Tick {fleetData.tick}
                </span>
                <span className="status-indicator" style={{ color: "#38bdf8", borderColor: "rgba(56, 189, 248, 0.3)" }}>
                  {pendingDirectives.length} Pending
                </span>
              </div>
              <div className="dashboard-stat-grid">
                <div className="stat-box">
                  <div className="value" style={{ color: "#10b981" }}>{stats.normal || 0}</div>
                  <div className="label">Normal</div>
                </div>
                <div className="stat-box">
                  <div className="value" style={{ color: "#3b82f6" }}>{stats.rerouting || 0}</div>
                  <div className="label">Rerouting</div>
                </div>
                <div className="stat-box">
                  <div className="value" style={{ color: "#ef4444" }}>{stats.distressed || 0}</div>
                  <div className="label">Distress</div>
                </div>
                <div className="stat-box">
                  <div className="value" style={{ color: "#f59e0b" }}>{stats.stopped || 0}</div>
                  <div className="label">Stopped</div>
                </div>
              </div>
            </div>

            <div className="dashboard-card">
              <div className="dashboard-card-title">Issue Directive</div>
              <div style={{ marginBottom: 12, fontSize: 13, color: "#94a3b8" }}>
                Target: <strong style={{ color: selectedShip ? "#f8fafc" : "inherit" }}>{selectedShip?.name || "Select a ship first"}</strong>
              </div>
              
              {isPlaybackMode && (
                <div style={{ marginBottom: 12, color: "#f59e0b", background: "rgba(245, 158, 11, 0.1)", padding: 10, borderRadius: 8, fontSize: 12, border: "1px solid rgba(245, 158, 11, 0.2)" }}>
                  Replay mode active: instructions disabled.
                </div>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
                <select
                  className="dashboard-input"
                  value={form.type}
                  onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                >
                  <option value="REROUTE">Change Route (Reroute)</option>
                  <option value="HOLD_POSITION">Hold Position</option>
                </select>
                <input
                  type="text"
                  className="dashboard-input"
                  placeholder="Reason / Note for captain"
                  value={form.message}
                  onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                />
                
                {form.type === "REROUTE" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: 12, background: "#0f172a", borderRadius: 8, border: "1px solid #1e293b" }}>
                    <div style={{ fontSize: 11, color: "#94a3b8", textTransform: "uppercase" }}>New Destination</div>
                    <input
                      type="text"
                      className="dashboard-input"
                      placeholder="Name (e.g. Port Alpha)"
                      value={form.destinationName}
                      onChange={(e) => setForm((f) => ({ ...f, destinationName: e.target.value }))}
                    />
                    <div style={{ display: "flex", gap: 8 }}>
                      <input
                        type="number"
                        step="any"
                        className="dashboard-input"
                        placeholder="Latitude"
                        value={form.destinationLat}
                        onChange={(e) => setForm((f) => ({ ...f, destinationLat: e.target.value }))}
                      />
                      <input
                        type="number"
                        step="any"
                        className="dashboard-input"
                        placeholder="Longitude"
                        value={form.destinationLng}
                        onChange={(e) => setForm((f) => ({ ...f, destinationLng: e.target.value }))}
                      />
                    </div>
                  </div>
                )}
              </div>

              <button
                type="button"
                disabled={!selectedShip || isPlaybackMode}
                onClick={() => {
                  if (!selectedShip) return;
                  onSendDirective?.({
                    shipId: selectedShip.id,
                    ...form,
                  });
                  setForm((f) => ({ ...f, message: "" }));
                }}
                className="dashboard-btn"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                Transmit Directive
              </button>
            </div>

            <div className="dashboard-card" style={{ padding: 0, overflow: "hidden" }}>
              <div className="dashboard-card-title" style={{ padding: "16px 16px 0" }}>Latest Responses</div>
              <div style={{ maxHeight: 200, overflowY: "auto", padding: 16 }}>
                {directiveResponses.length === 0 ? (
                  <div style={{ color: "#64748b", fontSize: 13, fontStyle: "italic" }}>No recent responses</div>
                ) : (
                  directiveResponses.slice(0, 20).map((item) => (
                    <div key={item.id} style={{ borderBottom: "1px solid #334155", paddingBottom: 10, marginBottom: 10 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <strong style={{ color: "#38bdf8", fontSize: 13 }}>{item.shipId}</strong>
                        <span style={{ fontSize: 11, background: "#1e293b", padding: "2px 6px", borderRadius: 4, color: "#cbd5e1" }}>{item.action}</span>
                      </div>
                      <div style={{ color: "#94a3b8", fontSize: 12 }}>{item.message || "(no message)"}</div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <AlertPanel alerts={alerts} onAcknowledge={onAcknowledgeAlert} />
            <ShipDetail ship={selectedShip} />
          </>
        ) : (
          <div
            className="collapsed-label"
            style={{ writingMode: "vertical-rl", transform: "rotate(180deg)", marginInline: "auto", background: "transparent", color: "#f8fafc", textShadow: "none", border: "none", boxShadow: "none" }}
          >
            COMMAND
          </div>
        )}
      </aside>
    </div>
  );
}

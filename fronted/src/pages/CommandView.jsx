import { useMemo, useState } from "react";
import FleetMap from "../map/FleetMap";
import ShipList from "../components/ShipList";
import AlertPanel from "../alerts/AlertPanel";
import ShipDetail from "../components/ShipDetail";

export default function CommandView({
  fleetData,
  stats,
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
        gridTemplateColumns: `${leftCollapsed ? "54px" : "290px"} 1fr ${rightCollapsed ? "54px" : "340px"}`,
        transition: "grid-template-columns 220ms ease",
      }}
    >
      <aside className="panel panel-left" style={{ overflow: "hidden", position: "relative" }}>
        <button
          type="button"
          onClick={() => setLeftCollapsed((v) => !v)}
          className="panel-toggle-btn"
          style={{ right: 8 }}
          title={leftCollapsed ? "Expand fleet" : "Collapse fleet"}
        >
          {leftCollapsed ? ">" : "<"}
        </button>
        {!leftCollapsed ? (
          <ShipList ships={fleetData.ships} selectedShipId={selectedShipId} onSelectShip={onSelectShip} />
        ) : (
          <div
            className="collapsed-label"
            style={{ padding: 10, writingMode: "vertical-rl", marginInline: "auto" }}
          >
            Fleet
          </div>
        )}
      </aside>

      <main style={{ minWidth: 0 }}>
        <FleetMap
          fleetData={fleetData}
          selectedShipId={selectedShipId}
          onSelectShip={onSelectShip}
          weatherCells={weatherCells}
          zones={zones}
          role="command"
          isDrawingZone={isDrawingZone}
          onStartDrawingZone={onStartDrawingZone}
          onFinishDrawingZone={onFinishDrawingZone}
          onCancelDrawingZone={onCancelDrawingZone}
          onAddZone={onAddZone}
          onRemoveZone={onRemoveZone}
        />
      </main>

      <aside
        className="panel panel-right"
        style={{
          overflowX: "hidden",
          overflowY: rightCollapsed ? "hidden" : "auto",
          position: "relative",
        }}
      >
        <button
          type="button"
          onClick={() => setRightCollapsed((v) => !v)}
          className="panel-toggle-btn"
          style={{ left: 8 }}
          title={rightCollapsed ? "Expand command panel" : "Collapse command panel"}
        >
          {rightCollapsed ? "<" : ">"}
        </button>
        {!rightCollapsed ? (
          <>
        <div className="panel-title-row" style={{ paddingLeft: 30 }}>
          <h3 className="panel-title">Command</h3>
          <button type="button" onClick={onLogout}>
            Logout
          </button>
        </div>
        <div className="chip-row">
          <span
            className={`chip ${connectionState === "connected" ? "chip-ok" : "chip-bad"}`}
          >
            Socket: {connectionState}
          </span>
          <span className="chip">
            Tick: {fleetData.tick}
          </span>
          <span className="chip">
            Pending directives: {pendingDirectives.length}
          </span>
        </div>
        <div className="muted small" style={{ margin: "8px 0 12px" }}>
          Updated: {new Date(fleetData.serverTime).toLocaleTimeString()}
        </div>

        <h4 style={{ margin: "0 0 8px" }}>Fleet Status</h4>
        <div className="small" style={{ marginBottom: 12, color: "#334155" }}>
          Normal {stats.normal || 0} | Rerouting {stats.rerouting || 0} | Distressed{" "}
          {stats.distressed || 0} | Stopped {stats.stopped || 0} | Arrived {stats.arrived || 0}
        </div>

        <h4 style={{ margin: "0 0 8px" }}>Ship Instructions</h4>
        <div className="muted small" style={{ marginBottom: 8 }}>
          Selected ship: {selectedShip?.name || "Select a ship from left panel"}
        </div>
        <div className="muted small" style={{ marginBottom: 8 }}>
          Choose action and press Send.
        </div>
        <div className="input-stack">
        <select
          value={form.type}
          onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
        >
          <option value="REROUTE">Change route (Reroute)</option>
          <option value="HOLD_POSITION">Stop ship (Hold position)</option>
        </select>
        <input
          type="text"
          placeholder="Reason / note for captain"
          value={form.message}
          onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
        />
        {form.type === "REROUTE" ? (
          <>
            <input
              type="text"
              placeholder="New destination name"
              value={form.destinationName}
              onChange={(e) => setForm((f) => ({ ...f, destinationName: e.target.value }))}
            />
            <input
              type="number"
              step="any"
              placeholder="New destination latitude"
              value={form.destinationLat}
              onChange={(e) => setForm((f) => ({ ...f, destinationLat: e.target.value }))}
            />
            <input
              type="number"
              step="any"
              placeholder="New destination longitude"
              value={form.destinationLng}
              onChange={(e) => setForm((f) => ({ ...f, destinationLng: e.target.value }))}
            />
          </>
        ) : null}
        </div>
        <button
          type="button"
          disabled={!selectedShip}
          onClick={() => {
            if (!selectedShip) return;
            onSendDirective?.({
              shipId: selectedShip.id,
              ...form,
            });
            setForm((f) => ({ ...f, message: "" }));
          }}
          className="btn-primary"
          style={{ width: "100%" }}
        >
          Send instruction
        </button>

        <h4 style={{ margin: "16px 0 8px" }}>Latest Responses</h4>
        <div style={{ maxHeight: 260, overflowY: "auto", fontSize: 12 }}>
          {directiveResponses.slice(0, 20).map((item) => (
            <div key={item.id} style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: 8, marginBottom: 8 }}>
              <div>
                <strong>{item.shipId}</strong> - {item.action}
              </div>
              <div style={{ color: "#475569" }}>{item.message || "(no message)"}</div>
            </div>
          ))}
        </div>
        <AlertPanel alerts={alerts} onAcknowledge={onAcknowledgeAlert} />
        <ShipDetail ship={selectedShip} />
          </>
        ) : (
          <div
            className="collapsed-label"
            style={{ writingMode: "vertical-rl", transform: "rotate(180deg)", marginInline: "auto" }}
          >
            Command
          </div>
        )}
      </aside>
    </div>
  );
}

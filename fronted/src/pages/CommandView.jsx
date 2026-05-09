import { useMemo, useState } from "react";
import FleetMap from "../map/FleetMap";
import ShipList from "../components/ShipList";

export default function CommandView({
  fleetData,
  stats,
  connectionState,
  pendingDirectives,
  selectedShipId,
  onSelectShip,
  onSendDirective,
  directiveResponses,
  onLogout,
}) {
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
    <div style={{ display: "grid", gridTemplateColumns: "280px 1fr 320px", height: "100vh" }}>
      <aside style={{ borderRight: "1px solid #dbe2ea", background: "#f8fafc" }}>
        <ShipList ships={fleetData.ships} selectedShipId={selectedShipId} onSelectShip={onSelectShip} />
      </aside>

      <main style={{ minWidth: 0 }}>
        <FleetMap fleetData={fleetData} selectedShipId={selectedShipId} onSelectShip={onSelectShip} />
      </main>

      <aside style={{ borderLeft: "1px solid #dbe2ea", background: "#f8fafc", padding: 12, fontSize: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0 }}>Command</h3>
          <button type="button" onClick={onLogout} style={{ border: "1px solid #cbd5e1", borderRadius: 6 }}>
            Logout
          </button>
        </div>
        <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap", fontSize: 12 }}>
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
          <span style={{ padding: "2px 8px", borderRadius: 999, background: "#e2e8f0", color: "#0f172a" }}>
            Tick: {fleetData.tick}
          </span>
          <span style={{ padding: "2px 8px", borderRadius: 999, background: "#e2e8f0", color: "#0f172a" }}>
            Pending directives: {pendingDirectives.length}
          </span>
        </div>
        <div style={{ margin: "8px 0 12px", color: "#475569", fontSize: 12 }}>
          Updated: {new Date(fleetData.serverTime).toLocaleTimeString()}
        </div>

        <h4 style={{ margin: "0 0 8px" }}>Fleet Status</h4>
        <div style={{ marginBottom: 12, fontSize: 12, color: "#334155" }}>
          Normal {stats.normal || 0} | Rerouting {stats.rerouting || 0} | Distressed{" "}
          {stats.distressed || 0} | Stopped {stats.stopped || 0} | Arrived {stats.arrived || 0}
        </div>

        <h4 style={{ margin: "0 0 8px" }}>Send Directive</h4>
        <div style={{ fontSize: 12, marginBottom: 8, color: "#64748b" }}>
          Target: {selectedShip?.name || "Select a ship"}
        </div>
        <select
          value={form.type}
          onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
          style={{ width: "100%", marginBottom: 8 }}
        >
          <option value="REROUTE">REROUTE</option>
          <option value="HOLD_POSITION">HOLD_POSITION</option>
        </select>
        <input
          type="text"
          placeholder="Directive message"
          value={form.message}
          onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
          style={{ width: "100%", marginBottom: 8 }}
        />
        {form.type === "REROUTE" ? (
          <>
            <input
              type="text"
              placeholder="Destination name"
              value={form.destinationName}
              onChange={(e) => setForm((f) => ({ ...f, destinationName: e.target.value }))}
              style={{ width: "100%", marginBottom: 8 }}
            />
            <input
              type="number"
              step="any"
              placeholder="Destination lat"
              value={form.destinationLat}
              onChange={(e) => setForm((f) => ({ ...f, destinationLat: e.target.value }))}
              style={{ width: "100%", marginBottom: 8 }}
            />
            <input
              type="number"
              step="any"
              placeholder="Destination lng"
              value={form.destinationLng}
              onChange={(e) => setForm((f) => ({ ...f, destinationLng: e.target.value }))}
              style={{ width: "100%", marginBottom: 8 }}
            />
          </>
        ) : null}
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
          style={{ width: "100%", padding: "8px 10px" }}
        >
          Send directive
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
      </aside>
    </div>
  );
}

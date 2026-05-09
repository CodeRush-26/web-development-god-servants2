import { useState } from "react";

export default function Login({ ships, onLogin }) {
  const shipOptions = Array.isArray(ships) ? ships : [];
  const [captainShipId, setCaptainShipId] = useState(shipOptions[0]?.id || "");

  return (
    <div className="login-shell">
      <div className="card login-card">
        <h2 style={{ marginTop: 0 }}>Select Role</h2>
        <p className="muted" style={{ marginTop: 0, fontSize: 14 }}>
          Choose Command (full fleet) or Captain (single ship). Live ships available:{" "}
          <strong>{shipOptions.length}</strong>
        </p>

        <button
          type="button"
          onClick={() => onLogin?.({ role: "command" })}
          className="btn-primary"
          style={{ width: "100%", marginBottom: 10 }}
        >
          Continue as Command
        </button>

        <div className="input-stack" style={{ marginTop: 10 }}>
          <div style={{ fontSize: 13, color: "#334155", marginBottom: 2 }}>Captain role</div>
          <select
            id="captainShip"
            value={captainShipId}
            onChange={(e) => setCaptainShipId(e.target.value)}
          >
            {shipOptions.map((ship) => (
              <option value={ship.id} key={ship.id}>
                {ship.name} ({ship.id})
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => {
              onLogin?.({ role: "captain", shipId: captainShipId || shipOptions[0]?.id || null });
            }}
            className="btn-primary"
            style={{ width: "100%" }}
          >
            Continue as Captain
          </button>
        </div>
      </div>
    </div>
  );
}

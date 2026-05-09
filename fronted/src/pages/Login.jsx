import { useState } from "react";

export default function Login({ ships, onLogin }) {
  const shipOptions = Array.isArray(ships) ? ships : [];
  const [captainShipId, setCaptainShipId] = useState(shipOptions[0]?.id || "");

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "#eef2f7",
        fontFamily: "Inter, system-ui, sans-serif",
      }}
    >
      <div
        style={{
          width: 420,
          maxWidth: "92vw",
          background: "#fff",
          border: "1px solid #dbe2ea",
          borderRadius: 12,
          padding: 20,
        }}
      >
        <h2 style={{ marginTop: 0 }}>Select Role</h2>
        <p style={{ marginTop: 0, color: "#475569", fontSize: 14 }}>
          Choose Command (full fleet) or Captain (single ship). Live ships available:{" "}
          <strong>{shipOptions.length}</strong>
        </p>

        <button
          type="button"
          onClick={() => onLogin?.({ role: "command" })}
          style={{
            width: "100%",
            border: "1px solid #2563eb",
            background: "#2563eb",
            color: "#fff",
            borderRadius: 8,
            padding: "10px 12px",
            marginBottom: 10,
            cursor: "pointer",
          }}
        >
          Continue as Command
        </button>

        <div style={{ marginTop: 10 }}>
          <div style={{ fontSize: 13, color: "#334155", marginBottom: 6 }}>Captain role</div>
          <select
            id="captainShip"
            style={{
              width: "100%",
              border: "1px solid #cbd5e1",
              borderRadius: 8,
              padding: "10px 12px",
              marginBottom: 10,
            }}
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
            style={{
              width: "100%",
              border: "1px solid #0f766e",
              background: "#0f766e",
              color: "#fff",
              borderRadius: 8,
              padding: "10px 12px",
              cursor: "pointer",
            }}
          >
            Continue as Captain
          </button>
        </div>
      </div>
    </div>
  );
}

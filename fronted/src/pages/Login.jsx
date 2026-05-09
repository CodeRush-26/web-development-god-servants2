import { useState } from "react";

export default function Login({ ships, onLogin }) {
  const shipOptions = Array.isArray(ships) ? ships : [];
  const [captainShipId, setCaptainShipId] = useState(shipOptions[0]?.id || "");

  return (
    <div className="login-shell">
      <div className="login-card-container">
        {/* Command Center Card */}
        <div 
          className="glass-card role-card"
          onClick={() => onLogin?.({ role: "command" })}
        >
          <div className="icon-wrapper">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
              <line x1="8" y1="21" x2="16" y2="21"></line>
              <line x1="12" y1="17" x2="12" y2="21"></line>
            </svg>
          </div>
          <h3>Command Center</h3>
          <p>Gain full visibility and control over the entire fleet. Monitor metrics, send directives, and manage zones globally.</p>
          <button
            type="button"
            className="login-btn"
            onClick={(e) => {
              e.stopPropagation();
              onLogin?.({ role: "command" });
            }}
          >
            Access Dashboard
          </button>
        </div>

        {/* Captain Terminal Card */}
        <div className="glass-card role-card">
          <div className="icon-wrapper">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>
            </svg>
          </div>
          <h3>Captain Terminal</h3>
          <p>Take command of a specific vessel. Receive directives, navigate zones, and report distress signals.</p>
          
          <div 
            className="login-select-wrapper" 
            onClick={(e) => e.stopPropagation()}
          >
            <label htmlFor="captainShip">Select Assigned Vessel</label>
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
              {shipOptions.length === 0 && <option value="">No ships available</option>}
            </select>
          </div>

          <button
            type="button"
            className="login-btn"
            onClick={(e) => {
              e.stopPropagation();
              onLogin?.({ role: "captain", shipId: captainShipId || shipOptions[0]?.id || null });
            }}
          >
            Board Vessel
          </button>
        </div>
      </div>
    </div>
  );
}

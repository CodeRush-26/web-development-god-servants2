export default function Timeline({
  history = [],
  isPlaybackMode,
  playbackTimestamp,
  onScrub,
  onBackToLive,
}) {
  if (!history.length) return null;
  const oldest = history[history.length - 1]?.timestamp || history[0]?.timestamp;
  const newest = history[0]?.timestamp;
  const value = Number(playbackTimestamp || newest);

  return (
    <div
      className="card"
      style={{
        position: "fixed",
        left: "50%",
        transform: "translateX(-50%)",
        bottom: 10,
        zIndex: 900,
        width: "min(900px, calc(100vw - 40px))",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <strong>Timeline Replay (Last Hour)</strong>
        {isPlaybackMode ? (
          <button type="button" className="btn-primary" onClick={onBackToLive}>
            Back to Live
          </button>
        ) : null}
      </div>
      <input
        type="range"
        min={oldest}
        max={newest}
        step={30 * 1000}
        value={value}
        onChange={(e) => onScrub?.(Number(e.target.value))}
        style={{ width: "100%" }}
      />
      <div className="small muted" style={{ marginTop: 6 }}>
        {new Date(oldest).toLocaleTimeString()} - {new Date(newest).toLocaleTimeString()} | Selected:{" "}
        {new Date(value).toLocaleTimeString()}
      </div>
    </div>
  );
}

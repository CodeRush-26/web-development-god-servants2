import { useEffect, useRef, useState } from "react";

export default function ZoneDrawer({
  role,
  isDrawingZone,
  drawPointsCount,
  onStartDrawing,
  onFinishDrawing,
  onCancelDrawing,
}) {
  const [position, setPosition] = useState({ x: null, y: 12 });
  const [dragging, setDragging] = useState(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const cardRef = useRef(null);

  useEffect(() => {
    if (position.x != null) return;
    const width = cardRef.current?.offsetWidth || 240;
    const centeredX = Math.max(8, Math.round(window.innerWidth / 2 - width / 2));
    setPosition((p) => ({ ...p, x: centeredX }));
  }, [position.x]);

  useEffect(() => {
    const onMouseMove = (e) => {
      if (!dragging) return;
      const width = cardRef.current?.offsetWidth || 240;
      const height = cardRef.current?.offsetHeight || 110;
      const nextX = Math.max(8, Math.min(window.innerWidth - width - 8, e.clientX - dragOffsetRef.current.x));
      const nextY = Math.max(8, Math.min(window.innerHeight - height - 8, e.clientY - dragOffsetRef.current.y));
      setPosition({ x: nextX, y: nextY });
    };
    const onMouseUp = () => setDragging(false);

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [dragging]);

  if (role !== "command") return null;

  return (
    <div
      ref={cardRef}
      className="card"
      style={{
        position: "absolute",
        top: position.y,
        left: position.x ?? 8,
        zIndex: 600,
        width: 240,
        background: "#ffffffed",
      }}
    >
      <div
        onMouseDown={(e) => {
          const rect = e.currentTarget.parentElement?.getBoundingClientRect();
          if (!rect) return;
          dragOffsetRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
          setDragging(true);
        }}
        style={{
          fontWeight: 600,
          fontSize: 14,
          marginBottom: 6,
          cursor: "grab",
          userSelect: "none",
          paddingBottom: 4,
          borderBottom: "1px dashed #cbd5e1",
        }}
      >
        Restricted Zones
      </div>
      {!isDrawingZone ? (
        <button type="button" className="btn-primary" onClick={onStartDrawing} style={{ width: "100%" }}>
          Draw Polygon
        </button>
      ) : (
        <>
          <div className="small muted" style={{ marginBottom: 8 }}>
            Click map to add points. Points stay until you press Finish Zone.
          </div>
          <div className="small" style={{ marginBottom: 8 }}>Points: {drawPointsCount}</div>
          <button
            type="button"
            disabled={drawPointsCount < 3}
            onClick={onFinishDrawing}
            className="btn-primary"
            style={{ width: "100%", marginBottom: 8 }}
          >
            Finish Zone
          </button>
          <button type="button" onClick={onCancelDrawing} style={{ width: "100%" }}>
            Cancel
          </button>
        </>
      )}
    </div>
  );
}

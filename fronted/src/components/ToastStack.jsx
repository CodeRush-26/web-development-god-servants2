export default function ToastStack({ toasts }) {
  if (!toasts?.length) return null;

  return (
    <div
      style={{
        position: "fixed",
        right: 16,
        bottom: 16,
        zIndex: 1000,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        pointerEvents: "none",
      }}
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          style={{
            minWidth: 260,
            maxWidth: 360,
            background: "linear-gradient(180deg, #0f172a 0%, #111f37 100%)",
            color: "#f8fafc",
            borderRadius: 10,
            padding: "10px 12px",
            border: "1px solid rgba(148, 163, 184, 0.25)",
            boxShadow: "0 10px 30px rgba(2, 6, 23, 0.38)",
          }}
        >
          <div style={{ fontWeight: 600, fontSize: 13 }}>{toast.title}</div>
          <div style={{ fontSize: 12, opacity: 0.9 }}>{toast.message}</div>
        </div>
      ))}
    </div>
  );
}

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
            background: "#0f172a",
            color: "#f8fafc",
            borderRadius: 10,
            padding: "10px 12px",
            boxShadow: "0 8px 24px rgba(2, 6, 23, 0.35)",
          }}
        >
          <div style={{ fontWeight: 600, fontSize: 13 }}>{toast.title}</div>
          <div style={{ fontSize: 12, opacity: 0.9 }}>{toast.message}</div>
        </div>
      ))}
    </div>
  );
}

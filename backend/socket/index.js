const pendingDirectives = [];
const directiveResponses = [];

function initSocket(io, getFleetSnapshot, applyDirective) {
  io.on("connection", (socket) => {
    console.log(`Client connected: ${socket.id}`);

    if (typeof getFleetSnapshot === "function") {
      socket.emit("fleet:update", getFleetSnapshot());
    }
    socket.emit("directive:sync", {
      pendingDirectives,
      directiveResponses,
    });

    socket.on("directive:send", (payload) => {
      const shipId = String(payload?.shipId || "").toUpperCase();
      if (!shipId) return;

      const event = {
        id: `dir_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        shipId,
        type: payload?.type || "REROUTE",
        message: payload?.message || "",
        destinationLat: payload?.destinationLat,
        destinationLng: payload?.destinationLng,
        destinationName: payload?.destinationName,
        from: payload?.from || "command",
        createdAt: Date.now(),
      };

      pendingDirectives.unshift(event);
      if (pendingDirectives.length > 200) pendingDirectives.length = 200;
      io.emit("directive:sent", event);
    });

    socket.on("directive:response", (payload) => {
      const shipId = String(payload?.shipId || "").toUpperCase();
      const action = String(payload?.action || "").toUpperCase();
      if (!shipId || !action) return;

      const event = {
        id: `resp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        shipId,
        action,
        message: payload?.message || "",
        from: payload?.from || "captain",
        directiveId: payload?.directiveId || null,
        createdAt: Date.now(),
      };

      if (action === "ACCEPT" && typeof applyDirective === "function") {
        applyDirective(shipId, payload?.directive || {});
      }

      const idx = pendingDirectives.findIndex((d) => d.id === event.directiveId);
      if (idx >= 0) pendingDirectives.splice(idx, 1);
      directiveResponses.unshift(event);
      if (directiveResponses.length > 300) directiveResponses.length = 300;

      io.emit("directive:response", event);
      if (typeof getFleetSnapshot === "function") {
        io.emit("fleet:update", getFleetSnapshot());
      }
    });

    socket.on("disconnect", () => {
      console.log(`Client disconnected: ${socket.id}`);
    });
  });
}

module.exports = { initSocket };


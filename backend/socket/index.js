function initSocket(io, getFleetSnapshot) {
  io.on("connection", (socket) => {
    console.log(`Client connected: ${socket.id}`);

    if (typeof getFleetSnapshot === "function") {
      socket.emit("fleet:update", getFleetSnapshot());
    }

    socket.on("disconnect", () => {
      console.log(`Client disconnected: ${socket.id}`);
    });
  });
}

module.exports = { initSocket };


const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");

const { initSocket } = require("./socket");
const { createShipsRouter } = require("./routes/ships");
const { createWeatherRouter } = require("./routes/weather");
const { startSimulator } = require("./simulator/simulator");

const PORT = process.env.PORT || 4000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "*";

const app = express();
app.use(express.json());
app.use(
  cors({
    origin: CLIENT_ORIGIN,
  })
);

app.get("/health", (req, res) => {
  res.json({ ok: true, service: "fleet-backend" });
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: CLIENT_ORIGIN,
  },
});

const simulator = startSimulator(io);
initSocket(
  io,
  simulator.getFleetSnapshot,
  simulator.applyDirective,
  simulator.markShipsRerouting,
  simulator.setRestrictedZones
);

app.use("/api/ships", createShipsRouter(simulator.getFleetSnapshot));
app.use("/api/weather", createWeatherRouter());

server.listen(PORT, () => {
  console.log(`Server running, simulator started on port ${PORT}`);
});


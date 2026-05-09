import { io } from "socket.io-client";

const socket = io("ws://localhost:4000", {
  transports: ["websocket"],
  autoConnect: true,
  reconnection: true,
});

export default socket;


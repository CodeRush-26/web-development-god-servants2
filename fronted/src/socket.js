import { io } from "socket.io-client";

const socket = io("http://localhost:4000", {
  autoConnect: true,
  reconnection: true,
  timeout: 8000,
});

export default socket;


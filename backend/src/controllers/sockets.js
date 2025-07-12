import { Server } from "socket.io";

const connectToSockets = (server) => {
  const io = new Server(server, {
    cors: {
      origin: ["http://localhost:5173", "https://loopmeet-zoom-clone.onrender.com"],
      methods: ["GET", "POST"],
      allowedHeaders: ["*"],
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    console.log("A User connected: ", socket.id);

    socket.on("join-call", ({ roomId, username }) => {
      socket.join(roomId);
      console.log(`roomId = ${roomId}, joined by ${username} ${socket.id}`);

      socket.to(roomId).emit("user-joined", { username, socketId: socket.id });
    });

    socket.on("send-message-event", (messageData) => {
      io.to(messageData.roomId).emit("receive-message-event", messageData);
    });

    socket.on("offer", ({ roomId, offer, to }) => {
      socket.to(to).emit("offer", { offer, from: socket.id });
    });

    socket.on("answer", ({ roomId, answer, to }) => {
      socket.to(to).emit("answer", { answer, from: socket.id });
    });

    socket.on("ice-candidate", ({ roomId, candidate, to }) => {
      socket.to(to).emit("ice-candidate", { candidate, from: socket.id });
    });

    socket.on("leave-call", ({ roomId }) => {
      socket.to(roomId).emit("user-left", { socketId: socket.id });
      socket.leave(roomId);
    });

    socket.on("disconnect", () => {
      // Handle cleanup when user disconnects
      socket.broadcast.emit("user-left", { socketId: socket.id });
    });
  });
};

export default connectToSockets;

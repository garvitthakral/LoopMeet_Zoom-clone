import { Server } from "socket.io";

let connections = {};
let messages = {};
let timeOnline = {};

export const connectToSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
      allowedHeaders: ["*"],
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    console.log("something Connected");
    socket.on("join-call", (path, callback) => {
      if (connections[path] === undefined) {
        connections[path] = [];
      }  

      connections[path].push(socket.id);
      timeOnline[socket.id] = new Date();

      const usersInRoom = connections[path].length;

      // Notify all other users in the room
      connections[path].forEach((element) => {
        if (element !== socket.id) {
          io.to(element).emit("user-joined", socket.id, connections[path]);
        }
      });

      // Send chat history to the new user (unchanged)
      if (messages[path] !== undefined) {
        messages[path].forEach((message) => {
          io.to(socket.id).emit(
            "chat_message",
            message["data"],
            message["sender"],
            message["socket-id-sender"]
          );
        });
      }

      // ✅ Send back number of users to the frontend caller
      if (callback) {
        callback(usersInRoom);
      }
    });

    socket.on("signal", (toid, message) => {
      io.to(toid).emit("signal", socket.id, message);
    });

    socket.on("chat-message", (data, sender) => {
      const match = Object.entries(connections).find(
        // _ is used to ignore the room name
        ([_, members]) => members.includes(socket.id)
      );

      if (match) {
        const [room, members] = match;

        if (!messages[room]) messages[room] = [];

        messages[room].push({
          sender,
          data,
          "socket-id-sender": socket.id,
        });

        console.log(`sender: ${sender} data: ${data}`);

        members.forEach((el) => {
          io.to(el).emit("chat-message", data, sender, socket.id);
        });
      }
    });

    socket.on("disconnect", () => {
      const diffTime = new Date() - timeOnline[socket.id];
      let roomKey = null;

      // Find the room this socket was part of
      for (const [key, members] of Object.entries(connections)) {
        const index = members.indexOf(socket.id);
        if (index !== -1) {
          roomKey = key;

          // Remove the disconnected user
          connections[key].splice(index, 1);

          // Notify remaining users
          connections[key].forEach((memberId) => {
            io.to(memberId).emit("user-left", socket.id);
          });

          // If the room is empty, delete it
          if (connections[key].length === 0) {
            delete connections[key];
          }

          break; // Exit the loop once found
        }
      }
    });
  });

  return io;
};

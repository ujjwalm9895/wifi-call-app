const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

// Map username to socket.id
const userSocketMap = {};

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("register-user", (username) => {
    userSocketMap[username] = socket.id;
    console.log(`Registered user ${username} → ${socket.id}`);
  });

  socket.on("call-user", ({ toUsername, signal, username }) => {
    const targetSocket = userSocketMap[toUsername];
    if (targetSocket) {
      io.to(targetSocket).emit("receive-call", {
        from: socket.id,
        signal,
        username
      });
    }
  });

  socket.on("answer-call", ({ signal, to }) => {
    io.to(to).emit("call-answered", { signal });
  });

  socket.on("disconnect", () => {
    // Remove user from map
    for (const [name, id] of Object.entries(userSocketMap)) {
      if (id === socket.id) {
        delete userSocketMap[name];
        break;
      }
    }
    console.log("User disconnected:", socket.id);
  });
});

server.listen(5000, () => {
  console.log("Server running on port 5000");
});

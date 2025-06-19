const express = require("express");
const http = require("http");
const path = require("path");
const cors = require("cors");
const { Server } = require("socket.io");

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

const userSocketMap = {};

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("register-user", (username) => {
    userSocketMap[username] = socket.id;
  });

  socket.on("call-user", ({ toUsername, signal, username }) => {
    const targetSocket = userSocketMap[toUsername];
    if (targetSocket) {
      io.to(targetSocket).emit("receive-call", { from: socket.id, signal, username });
    }
  });

  socket.on("answer-call", ({ signal, to }) => {
    io.to(to).emit("call-answered", { signal });
  });

  socket.on("disconnect", () => {
    for (const [name, id] of Object.entries(userSocketMap)) {
      if (id === socket.id) {
        delete userSocketMap[name];
        break;
      }
    }
  });
});

// Serve static frontend
app.use(express.static(path.join(__dirname, "../client/out")));

app.get("/*", (req, res) => {
  res.sendFile(path.join(__dirname, "../client/out/index.html"));
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

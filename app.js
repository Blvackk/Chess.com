const express = require("express");
const socket = require("socket.io");
const http = require("http");
const { Chess } = require("chess.js");
const path = require("path");
const cors = require("cors");

const app = express();
const server = http.createServer(app);

// ✅ Allow connection from Vercel frontend
const io = socket(server, {
  cors: {
    origin: "https://chess-com.vercel.app", // <-- your Vercel frontend
    methods: ["GET", "POST"]
  }
});

// ✅ Express also needs to allow CORS
app.use(cors({
  origin: "https://chess-com.vercel.app", // same here
  methods: ["GET", "POST"]
}));

const chess = new Chess();
let players = {};

app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.render("index", { title: "Chess Game" });
});

io.on("connection", (uniquesocket) => {
  console.log("connected:", uniquesocket.id);

  if (!players.white) {
    players.white = uniquesocket.id;
    uniquesocket.emit("playerRole", "w");
    console.log("Assigned WHITE to", uniquesocket.id);
  } else if (!players.black) {
    players.black = uniquesocket.id;
    uniquesocket.emit("playerRole", "b");
    console.log("Assigned BLACK to", uniquesocket.id);
  } else {
    uniquesocket.emit("spectatorRole");
    console.log("Assigned SPECTATOR to", uniquesocket.id);
  }

  uniquesocket.on("disconnect", () => {
    if (uniquesocket.id === players.white) {
      delete players.white;
      console.log("WHITE disconnected");
    } else if (uniquesocket.id === players.black) {
      delete players.black;
      console.log("BLACK disconnected");
    }
  });

  uniquesocket.on("move", (move) => {
    try {
      if (chess.turn() === 'w' && uniquesocket.id !== players.white) return;
      if (chess.turn() === 'b' && uniquesocket.id !== players.black) return;

      const result = chess.move(move);
      if (result) {
        io.emit("move", move);
        io.emit("boardState", chess.fen());
        console.log("Move made:", move);
      } else {
        console.log("Invalid move:", move);
        uniquesocket.emit("invalidMove", move);
      }
    } catch (err) {
      console.log("Move error:", err);
      uniquesocket.emit("invalidMove", move);
    }
  });
});

// ✅ Use dynamic port (important for Render)
const PORT = process.env.PORT || 3135;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

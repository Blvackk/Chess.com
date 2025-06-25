const express = require("express");
const socket = require("socket.io");
const http = require("http");
const { Chess } = require("chess.js");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = socket(server);

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

server.listen(3135, () => {
    console.log("listening on port 3135");
});

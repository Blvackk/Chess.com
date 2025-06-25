const socket = io(); 
const chess = new Chess();
const boardElement = document.querySelector(".chessboard");

let draggedPiece = null;
let sourceSquare = null;
let playerRole = null; // ✅ spelling fixed

const renderBoard = () => {
  const board = chess.board();
  boardElement.innerHTML = "";

  board.forEach((row, rowindex) => {
    row.forEach((square, squareindex) => {
      const squareElement = document.createElement("div");
      squareElement.classList.add(
        "square",
        (rowindex + squareindex) % 2 === 0 ? "light" : "dark"
      );

      squareElement.dataset.row = rowindex;
      squareElement.dataset.col = squareindex;

      if (square) {
        const pieceElement = document.createElement("div");
        pieceElement.classList.add("piece", square.color === "w" ? "white" : "black");

        pieceElement.innerText = getPieceUnicode(square); 

        // ✅ Only allow dragging for own pieces and correct turn
        pieceElement.draggable = playerRole === square.color && playerRole === chess.turn();

        pieceElement.addEventListener("dragstart", (e) => {
          if (pieceElement.draggable) {
            draggedPiece = pieceElement;
            sourceSquare = { row: rowindex, col: squareindex };
            e.dataTransfer.setData("text/plain", "");
          }
        });

        pieceElement.addEventListener("dragend", () => {
          draggedPiece = null;
          sourceSquare = null;
        });

        squareElement.appendChild(pieceElement);
      }

      squareElement.addEventListener("dragover", function (e) {
        e.preventDefault();
      });

      squareElement.addEventListener("drop", function (e) {
        e.preventDefault();
        if (draggedPiece) {
          const targetSource = {
            row: parseInt(squareElement.dataset.row),
            col: parseInt(squareElement.dataset.col),
          };
          handleMove(sourceSquare, targetSource);
        }
      });

      boardElement.appendChild(squareElement);
    });
  });

  if (playerRole === 'b') {
    boardElement.classList.add("flipped");
  } else {
    boardElement.classList.remove("flipped");
  }
};

const handleMove = (source, target) => {
  const move = {
    from: `${String.fromCharCode(97 + source.col)}${8 - source.row}`,
    to: `${String.fromCharCode(97 + target.col)}${8 - target.row}`,
    promotion: 'q'
  };

  const result = chess.move(move);
  if (result) {
    socket.emit("move", move); // ✅ emit only if legal move
    renderBoard(); // optional: re-render locally
  } else {
    alert("Illegal move!");
  }
};

const getPieceUnicode = (piece) => {
  const unicodePieces = {
    p: { b: "♟", w: "♙" },
    r: { b: "♜", w: "♖" },
    n: { b: "♞", w: "♘" },
    b: { b: "♝", w: "♗" },
    q: { b: "♛", w: "♕" },
    k: { b: "♚", w: "♔" },
  };
  return unicodePieces[piece.type]?.[piece.color] || "";
};

// ✅ Set player role
socket.on("playerRole", function (role) {
  playerRole = role;
  console.log("Assigned role:", playerRole);
  renderBoard();
});

socket.on("spectatorRole", function () {
  playerRole = null;
  console.log("You are a spectator.");
  renderBoard();
});

// ✅ Load full board state (from FEN)
socket.on("boardState", function (fen) {
  chess.load(fen);
  renderBoard();
});

// ✅ Apply move from another player
socket.on("move", function (move) {
  chess.move(move); // ✅ fixed: used move, not 'fen'
  renderBoard();
});

// ✅ Initial render
renderBoard();

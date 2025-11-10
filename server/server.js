const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

const PORT = process.env.PORT || 3001;

// Store active rooms
const rooms = new Map();

// Generate random room code
function generateRoomCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Get available player number in room
function getAvailablePlayerNumber(room) {
  const takenNumbers = room.players.map(p => p.playerNumber);
  for (let i = 1; i <= 4; i++) {
    if (!takenNumbers.includes(i)) {
      return i;
    }
  }
  return null;
}

io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  // Create room
  socket.on('createRoom', ({ playerName }) => {
    const roomCode = generateRoomCode();
    const player = {
      id: socket.id,
      name: playerName,
      playerNumber: 1,
      isReady: false,
    };

    rooms.set(roomCode, {
      code: roomCode,
      host: socket.id,
      players: [player],
      gameStarted: false,
    });

    socket.join(roomCode);
    socket.emit('roomCreated', {
      roomCode,
      playerNumber: 1,
      players: [player],
    });

    console.log(`Room created: ${roomCode} by ${playerName}`);
  });

  // Join room
  socket.on('joinRoom', ({ roomCode, playerName }) => {
    const room = rooms.get(roomCode);

    if (!room) {
      socket.emit('roomNotFound');
      return;
    }

    if (room.players.length >= 4) {
      socket.emit('roomFull');
      return;
    }

    if (room.gameStarted) {
      socket.emit('gameAlreadyStarted');
      return;
    }

    const playerNumber = getAvailablePlayerNumber(room);
    const player = {
      id: socket.id,
      name: playerName,
      playerNumber,
      isReady: false,
    };

    room.players.push(player);
    socket.join(roomCode);

    socket.emit('roomJoined', {
      roomCode,
      playerNumber,
      players: room.players,
    });

    // Notify other players
    socket.to(roomCode).emit('playerJoined', {
      players: room.players,
      playerName,
    });

    console.log(`${playerName} joined room: ${roomCode}`);
  });

  // Player ready
  socket.on('playerReady', ({ roomCode, isReady }) => {
    const room = rooms.get(roomCode);
    if (!room) return;

    const player = room.players.find(p => p.id === socket.id);
    if (player) {
      player.isReady = isReady;
      io.to(roomCode).emit('playerReady', {
        playerId: socket.id,
        isReady,
      });
    }
  });

  // Start game
  socket.on('startGame', ({ roomCode }) => {
    const room = rooms.get(roomCode);
    if (!room) return;

    // Check if requester is host
    if (room.host !== socket.id) {
      socket.emit('notHost');
      return;
    }

    // Check if all players are ready
    const allReady = room.players.every(p => p.isReady);
    if (!allReady) {
      socket.emit('playersNotReady');
      return;
    }

    room.gameStarted = true;
    io.to(roomCode).emit('gameStarted');
    console.log(`Game started in room: ${roomCode}`);
  });

  // Game actions - Dice roll
  socket.on('rollDice', ({ roomCode, diceNo }) => {
    socket.to(roomCode).emit('diceRolled', { diceNo });
  });

  // Game actions - Move piece
  socket.on('movePiece', ({ roomCode, playerNo, pieceId, pos, travelCount }) => {
    socket.to(roomCode).emit('pieceMove', {
      playerNo,
      pieceId,
      pos,
      travelCount,
    });
  });

  // Game actions - Change turn
  socket.on('changeTurn', ({ roomCode, chancePlayer }) => {
    socket.to(roomCode).emit('playerTurnChanged', { chancePlayer });
  });

  // Game actions - Declare winner
  socket.on('declareWinner', ({ roomCode, winner }) => {
    io.to(roomCode).emit('gameWinner', { winner });
  });

  // Leave room
  socket.on('leaveRoom', ({ roomCode }) => {
    handlePlayerLeave(socket, roomCode);
  });

  // Disconnect
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    
    // Find and remove player from all rooms
    rooms.forEach((room, roomCode) => {
      handlePlayerLeave(socket, roomCode);
    });
  });

  function handlePlayerLeave(socket, roomCode) {
    const room = rooms.get(roomCode);
    if (!room) return;

    const playerIndex = room.players.findIndex(p => p.id === socket.id);
    if (playerIndex === -1) return;

    const player = room.players[playerIndex];
    room.players.splice(playerIndex, 1);

    socket.leave(roomCode);

    if (room.players.length === 0) {
      // Delete empty room
      rooms.delete(roomCode);
      console.log(`Room deleted: ${roomCode}`);
    } else {
      // If host left, assign new host
      if (room.host === socket.id) {
        room.host = room.players[0].id;
      }

      // Notify remaining players
      io.to(roomCode).emit('playerLeft', {
        players: room.players,
        playerName: player.name,
      });
    }

    console.log(`${player.name} left room: ${roomCode}`);
  }
});

app.get('/', (req, res) => {
  res.send('Ludo Game Server is running!');
});

app.get('/status', (req, res) => {
  res.json({
    status: 'online',
    activeRooms: rooms.size,
    rooms: Array.from(rooms.values()).map(room => ({
      code: room.code,
      players: room.players.length,
      gameStarted: room.gameStarted,
    })),
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Local: http://localhost:${PORT}`);
  console.log(`Network: http://0.0.0.0:${PORT}`);
});

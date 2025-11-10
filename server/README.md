# Ludo Game Server

This is the Socket.IO server for the Ludo game multiplayer feature.

## Setup

1. Install dependencies:
```bash
cd server
npm install
```

2. Start the server:
```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

## Configuration

The server runs on port 3001 by default. You can change this by setting the PORT environment variable:

```bash
PORT=3002 npm start
```

## Endpoints

- `GET /` - Server status check
- `GET /status` - Get active rooms and player count

## Socket Events

### Client to Server:
- `createRoom` - Create a new game room
- `joinRoom` - Join an existing room
- `playerReady` - Mark player as ready
- `startGame` - Start the game (host only)
- `rollDice` - Broadcast dice roll
- `movePiece` - Broadcast piece movement
- `changeTurn` - Broadcast turn change
- `declareWinner` - Broadcast winner
- `leaveRoom` - Leave the room

### Server to Client:
- `roomCreated` - Room creation confirmation
- `roomJoined` - Room join confirmation
- `playerJoined` - New player joined
- `playerLeft` - Player left the room
- `playerReady` - Player ready status changed
- `gameStarted` - Game has started
- `diceRolled` - Dice was rolled
- `pieceMove` - Piece was moved
- `playerTurnChanged` - Turn changed
- `gameWinner` - Winner declared

## Deployment

For production deployment, you can use services like:
- Heroku
- Railway
- Render
- DigitalOcean
- AWS EC2

Make sure to update the `SOCKET_URL` in `src/services/socketService.ts` with your deployed server URL.

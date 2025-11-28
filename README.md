# Slither.iOS

A multiplayer snake game inspired by [slither.io](http://slither.io/), featuring private lobbies, custom snake skins, and real-time gameplay.

## Features

- **Private Lobbies** - Create or join games using unique game codes to play with friends
- **Custom Snake Skins** - 9 unique skins with rotating PNG heads and gradient body segments
- **Real-time Multiplayer** - WebSocket-based synchronization for smooth, low-latency gameplay
- **Live Leaderboard** - Track scores with your current rank highlighted
- **Player Name Tags** - See other players' usernames floating above their snakes

## How to Play

1. **Objective**: Grow your snake by eating orbs scattered across the map
2. **Controls**: Move your mouse to steer your snake - it follows your cursor
3. **Survival**: Avoid colliding with other snakes or the map boundary
4. **Strategy**: When snakes die, they drop large orbs - a risky but rewarding opportunity

## Getting Started

### Prerequisites
- Java 17+
- Node.js & npm
- Maven

### Running the Server
```bash
cd server
mvn clean compile exec:java -Dexec.mainClass="com.slitherios.server.SlitherServer"
```

### Running the Client
```bash
cd client
npm install  # First time only
npm start
```

The game will open in your browser at `http://localhost:3000`.

### Playing with Friends (Local Network)

For multiplayer across different machines, you can use [ngrok](https://ngrok.com/):

```bash
ngrok tcp 9000 --authtoken <your-authtoken>
```

Share the ngrok URL with friends. They'll need to update the `host` field in `client/src/App.tsx` to connect to your server.

## Tech Stack

- **Backend**: Java with WebSocket server
- **Frontend**: React + TypeScript
- **Communication**: WebSocket protocol for real-time updates

## Project Structure

```
slither-plus/
├── client/          # React frontend
│   └── src/
│       ├── game/    # Game rendering (canvas, snakes, orbs)
│       ├── home/    # Landing page
│       └── message/ # WebSocket message types
└── server/          # Java backend
    └── src/main/java/com/slitherios/
        ├── server/      # WebSocket server
        ├── gameState/   # Game logic
        ├── leaderboard/ # Score tracking
        └── orb/         # Orb generation
```

## Credits

This project is a fork and continuation of [Slither+](https://github.com/cs0320-f2022/term-project-kkashyap-mpan11-nharbiso-plestz), originally created as a Brown University CSCI0320 term project by:
- Karan Kashyap
- Mason Pan
- Nathan Harbison
- Paul Lestz

## License

MIT

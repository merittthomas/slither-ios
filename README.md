# Slither.iOS 🐍

A multiplayer snake game inspired by [slither.io](http://slither.io/), featuring private lobbies, custom snake skins, and real-time gameplay. Built with a Java WebSocket backend and React/TypeScript frontend.

## Features

- **Private Lobbies** - Create or join games using unique game codes to play with friends
- **Custom Snake Skins** - 9 unique skins with rotating PNG heads and gradient body segments
- **Real-time Multiplayer** - WebSocket-based synchronization for smooth, low-latency gameplay
- **Live Leaderboard** - Track scores with your current rank highlighted
- **Player Name Tags** - See other players' usernames floating above their snakes
- **Collision Detection** - Snake-to-snake, snake-to-orb, and boundary collision handling
- **Death Orbs** - When snakes die, they drop large orbs for other players to collect

## How to Play

1. **Objective**: Grow your snake by eating orbs scattered across the map
2. **Controls**: Move your mouse to steer your snake - it follows your cursor
3. **Survival**: Avoid colliding with other snakes or the map boundary
4. **Strategy**: When snakes die, they drop large orbs - a risky but rewarding opportunity

## Getting Started

### Prerequisites
- Java 17+
- Node.js & npm
- Maven 3.6.0+

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

### Playing with Friends (Remote Multiplayer)

Since the webapp is not deployed, playing with multiple users across different networks is facilitated through [ngrok](https://ngrok.com/). Install ngrok and create a free account to get your authtoken, then run:

```bash
ngrok tcp 9000 --authtoken <your-authtoken>
```

Keep this running while playing. Share the ngrok routing link with friends - they'll need to paste it into the `host` field of the `AppConfig` object in `client/src/App.tsx`. Only the host needs ngrok; other players just run the client.

## Tech Stack

- **Backend**: Java 17 with WebSocket server (Java-WebSocket library)
- **Frontend**: React 18 + TypeScript
- **Communication**: WebSocket protocol for real-time bidirectional updates
- **Build Tools**: Maven (server), npm (client)
- **Serialization**: Moshi for JSON parsing

## Architecture

### Backend (Server)

The heart of the backend is `SlitherServer`, which synchronizes data between all clients connected to their respective `GameState`. It operates by routinely sending and receiving serialized messages from all clients via WebSockets, enabling concurrent multiplayer gameplay.

**Key Components:**

| Package | Description |
|---------|-------------|
| `server` | WebSocket server managing client connections and message routing |
| `gameState` | Controls orb regeneration, snake position updates, and collision detection |
| `leaderboard` | Updates and structures the score leaderboard |
| `gamecode` | Manages creation of unique game codes |
| `orb` | Controls orb structure (location, size, color) and generation |
| `message` | Defines all message types sent between client and server |
| `position` | Contains the `Position` record (x/y coordinates) |
| `user` | User class with unique UUID and username |
| `exceptions` | Custom exception classes |
| `actionHandlers` | Handlers for position updates and new client connections |

### Frontend (Client)

The frontend is split into two main areas: **Home** and **Game**.

**Home** renders the landing screen with:
- How-to-play instructions
- Username input
- Options to create a new game or join via game code

**Game** contains:
- `GameCanvas` - Renders the play area, handles mouse-based snake movement using a double-ended queue, draws orbs, other snakes, and the map boundary
- `Leaderboard` - Displays real-time scores
- `Gamecode` - Shows the current lobby code

The snake movement is implemented using a double-ended queue: when `moveSnake` calculates a new position, it adds to the front and removes from the back, creating smooth movement toward the mouse cursor.

### WebSocket Messages

Key message types for client-server communication:
- `UPDATE_POSITION` - Syncs snake positions across clients
- `INCREASE_OWN_LENGTH` / `INCREASE_OTHER_LENGTH` - Snake growth on orb collection
- `YOU_DIED` / `OTHER_USER_DIED` - Death notifications
- `SEND_ORBS` - Orb state synchronization
- `UPDATE_LEADERBOARD` - Score updates

## Project Structure

```
slither-plus/
├── client/                          # React frontend
│   └── src/
│       ├── game/                    # Game rendering
│       │   ├── Game.tsx             # Main game component
│       │   ├── GameCanvas.tsx       # Canvas rendering & movement
│       │   ├── GameState.ts         # Client game state interface
│       │   ├── snake/               # Snake rendering & skins
│       │   └── orb/                 # Orb rendering
│       ├── home/                    # Landing page
│       └── message/                 # WebSocket message types
└── server/                          # Java backend
    └── src/main/java/com/slitherios/
        ├── server/                  # WebSocket server
        ├── gameState/               # Game logic & state
        ├── leaderboard/             # Score tracking
        ├── orb/                     # Orb generation
        ├── gamecode/                # Game code generation
        ├── message/                 # Message types
        ├── position/                # Position record
        ├── user/                    # User management
        ├── actionHandlers/          # Event handlers
        └── exceptions/              # Custom exceptions
```

## Snake Skins

9 distinct snake skins are available:

| Skin | Head Color | Body Gradient |
|------|------------|---------------|
| Astro | Blue | Blue gradient |
| Beta | Red | Red gradient |
| Charlie | Green | Green gradient |
| Delta | Purple | Purple gradient |
| Echo | Orange | Orange gradient |
| Foxtrot | Cyan | Cyan gradient |
| Golf | Yellow | Yellow gradient |
| Hotel | Pink | Pink gradient |
| Ion | White | White gradient |

Each skin features:
- PNG head image with dynamic rotation based on movement direction
- HSL-based radial gradient system for 3D-looking body segments
- Random assignment on game start

## Testing

### Running Tests

**Backend (Maven):**
```bash
cd server
mvn test
```

**Frontend (npm):**
```bash
cd client
npm test
```

### Test Coverage

**Server Tests:**
- `OrbTest.java` - Orb equality and hash methods
- `OrbGeneratorTest.java` - Orb generation with varying existing orbs and death orbs
- `OrbColorTest.java` - Pseudo-random color generation
- `GameCodeGeneratorTest.java` - Game code generation and character validation (fuzz tested)

**Client Tests:**
- `Home.test.tsx` - Homepage component rendering
- `GameCanvas.test.tsx` - Helper function tests
- `Game.test.tsx` - Leaderboard extraction tests

## Accessibility

Accessibility features are enabled on text-based pages (home screen, instructions) via `aria-label` and `aria-roledescription` tags, supporting screen readers and magnifiers. The gameplay itself requires visual ability and mouse control.

## Known Issues

No known bugs in the current version.

## Credits

This project is a fork and continuation of [Slither+](https://github.com/karankashyap04/slither-plus), originally created by:
- Karan Kashyap
- Mason Pan
- Nathan Harbison
- Paul Lestz

## License

This project is licensed under the **MIT License**.

The MIT License is a permissive open-source license that allows you to:
- **Use** the software for any purpose (commercial or personal)
- **Copy** and distribute the software
- **Modify** the software and create derivative works
- **Sublicense** and sell copies of the software

The only requirements are:
- Include the original copyright notice and license text in any copies
- The software is provided "as is" without warranty

Full license text:

```
MIT License

Copyright (c) 2025 Slither.iOS Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

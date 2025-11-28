import Denque from "denque";
import { useState, Dispatch, SetStateAction } from "react";

import "./App.css";

import GameState, { Position } from "./game/GameState";
import Game from "./game/Game";
import { OrbData } from "./game/orb/Orb";
import { SnakeData, SNAKE_VELOCITY } from "./game/snake/Snake";
import { getRandomSkin } from "./game/snake/SnakeSkins";
import Home from "./home/Home";

import MessageType from "./message/messageTypes";
import {
  IncreaseOtherLengthMessage,
  IncreaseOwnLengthMessage,
  leaderboardData,
  leaderboardEntry,
  OtherUserDiedMessage,
  sendNewClientNoCodeMessage,
  sendNewClientWithCodeMessage,
  UpdatePositionMessage,
} from "./message/message";

/**
 * Creates and returns the overarching HTML element representing the Slither+
 * app at any given moment, appropriately either the home or in-game screen
 * @returns the overarching HTML SLither+ app element
 */
export default function App(): JSX.Element {
  const [gameStarted, setGameStarted] = useState(false);
  const [scores, setScores] = useState(new Map<string, number>());
  const [gameCode, setGameCode] = useState("");
  const [username, setUsername] = useState("");

  const orbSet = new Set<OrbData>();

  // initial snake with random skin (10 segments = spawn length at 0 points)
  const snakeBody: Position[] = [];
  for (let i = 0; i < 10; i++) {
    snakeBody.push({ x: 600, y: 100 + 5 * i });
  }
  const snake: SnakeData = {
    snakeBody: new Denque(snakeBody),
    velocityX: 0,
    velocityY: SNAKE_VELOCITY,
    skin: getRandomSkin(),
  };

  const [gameState, setGameState] = useState<GameState>({
    snake: snake,
    otherBodies: new Set<string>([]),
    otherPlayerSkins: new Map<string, string>(),
    otherPlayerHeads: new Map<string, string>(),
    otherPlayerRotations: new Map<string, number>(),
    otherPlayerUsernames: new Map<string, string>(),
    otherPlayerBoosting: new Map<string, boolean>(),
    orbs: orbSet,
    scores: new Map(),
    gameCode: "abc",
  });

  return (
    <div className="App">
      {gameStarted ? (
        <Game
          gameState={gameState}
          setGameState={setGameState}
          scores={scores}
          gameCode={gameCode}
          socket={socket}
          username={username}
        />
      ) : (
        <Home
          setGameStarted={setGameStarted}
          setScores={setScores}
          setGameCode={setGameCode}
          gameState={gameState}
          setGameState={setGameState}
          orbSet={orbSet}
          setAppUsername={setUsername}
        />
      )}
    </div>
  );
}

//----------------------------------------------------------------------------
// Websocket with backend set-up

/** Metadata for forming the URL to connect with the server websocket */
const AppConfig = {
  PROTOCOL: "ws:",
  HOST: "//localhost",
  PORT: ":9000",
};

/** The client's websocket for communication with the server */
let socket: WebSocket;

/**
 * Creates a websocket for communcation with the Slither+ server
 * @param setScores A funcion that sets the current leaderboard (set of scores) for the game
 * @param setGameStarted A function that sets whether or not the client has started playing the game
 * @param setErrorText A function that sets any error message to be rendered on the home page
 * @param setGameCode A function that sets the current lobby's game code
 * @param orbSet A list of all orbs stored in metadata form
 * @param gameState A metadata representation of the current state of the game
 * @param setGameState A function that sets the current state of the game
 * @param username The username of the client
 * @param skinId The ID of the client's selected snake skin
 * @param hasGameCode A boolean representing whether or not the client is
 * joining an existing game with a game code
 * @param gameCode The game code entered by the client, if applicable
 */
export function registerSocket(
  setScores: Dispatch<SetStateAction<Map<string, number>>>,
  setGameStarted: Dispatch<SetStateAction<boolean>>,
  setErrorText: Dispatch<SetStateAction<string>>,
  setGameCode: Dispatch<SetStateAction<string>>,
  orbSet: Set<OrbData>,
  gameState: GameState,
  setGameState: Dispatch<SetStateAction<GameState>>,
  username: string,
  skinId: string,
  hasGameCode: boolean,
  gameCode: string = ""
) {
  // Local reference to track scores for later use
  let currentScores = new Map<string, number>();

  // running game on localhost
  socket = new WebSocket(AppConfig.PROTOCOL + AppConfig.HOST + AppConfig.PORT);

  // running game on ngrok
  // socket = new WebSocket(AppConfig.PROTOCOL + AppConfig.HOST);

  socket.onopen = () => {
    console.log("client: A new client-side socket was opened!");
    // Store username for later use when player dies
    localStorage.setItem('currentUsername', username);
    if (hasGameCode) {
      sendNewClientWithCodeMessage(socket, username, skinId, gameCode);
    } else {
      sendNewClientNoCodeMessage(socket, username, skinId);
    }
  };

  // different functionality based on received message type from server
  socket.onmessage = (response: MessageEvent) => {
    let message = JSON.parse(response.data);
    switch (message.type) {
      // successfully joined a game
      case MessageType.JOIN_SUCCESS: {
        setGameStarted(true);
        break;
      }

      // unsuccessfully joined a game
      case MessageType.JOIN_ERROR: {
        setErrorText("Error: Failed to join the game!");
        setGameStarted(false); // not truly necessary, just to be safe
        break;
      }

      // username already taken in this lobby
      case MessageType.USERNAME_TAKEN: {
        setErrorText("Username already taken in this lobby. Please choose a different name.");
        setGameStarted(false);
        break;
      }

      // updates position of all snakes on screen
      case MessageType.UPDATE_POSITION: {
        console.log("UPDATE POSITION MESSAGE");
        const updatePositionMessage: UpdatePositionMessage = message;
        const toAdd: Position = updatePositionMessage.data.add;
        const toRemove: Position = updatePositionMessage.data.remove;
        const skinId: string = message.data.skinId || "astro";
        const username: string = message.data.username || "";
        const isBoosting: boolean = message.data.boosting || false;
        const newGameState: GameState = { ...gameState };
        console.log(
          "gameState otherbodies size: " + gameState.otherBodies.size
        );
        const removeKey = JSON.stringify(toRemove);
        const addKey = JSON.stringify(toAdd);
        newGameState.otherBodies.delete(removeKey);
        newGameState.otherPlayerSkins.delete(removeKey);
        newGameState.otherBodies.add(addKey);
        newGameState.otherPlayerSkins.set(addKey, skinId);

        // Calculate rotation based on movement direction (from previous head to new head)
        const prevHeadKey = newGameState.otherPlayerHeads.get(skinId);
        if (prevHeadKey) {
          const prevHead: Position = JSON.parse(prevHeadKey);
          const dx = toAdd.x - prevHead.x;
          const dy = toAdd.y - prevHead.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance > 2) {
            const angleRadians = Math.atan2(dy, dx);
            const angleDegrees = angleRadians * (180 / Math.PI);
            newGameState.otherPlayerRotations.set(skinId, angleDegrees);
          }
        }

        // Track the head position, username, and boosting state for this player
        newGameState.otherPlayerHeads.set(skinId, addKey);
        newGameState.otherPlayerUsernames.set(skinId, username);
        newGameState.otherPlayerBoosting.set(skinId, isBoosting);
        setGameState(newGameState);
        break;
      }

      // client's snake died
      case MessageType.YOU_DIED: {
        // Store the player's score in localStorage before reloading
        const currentUsername = localStorage.getItem('currentUsername') || '';
        const playerScore = currentScores.get(currentUsername) || 0;
        localStorage.setItem('lastScore', playerScore.toString());
        // currently just reloading to force the home screen to open
        // see if we want to do anything else here
        window.location.reload();
        break;
      }

      // another client's snake died
      case MessageType.OTHER_USED_DIED: {
        const otherUserDiedMessage: OtherUserDiedMessage = message;
        const removePositions: Position[] =
          otherUserDiedMessage.data.removePositions;
        const deadSkinId: string = message.data.skinId || "";
        console.log("removePositions");
        console.log(removePositions);
        const newGameState: GameState = { ...gameState };
        removePositions.forEach((position: Position) => {
          const posKey = JSON.stringify(position);
          newGameState.otherBodies.delete(posKey);
          newGameState.otherPlayerSkins.delete(posKey);
        });
        // Remove the head, rotation, username, and boosting tracking for this dead player
        if (deadSkinId) {
          newGameState.otherPlayerHeads.delete(deadSkinId);
          newGameState.otherPlayerRotations.delete(deadSkinId);
          newGameState.otherPlayerUsernames.delete(deadSkinId);
          newGameState.otherPlayerBoosting.delete(deadSkinId);
        }
        setGameState(newGameState);
        break;
      }

      // updating users' scores
      case MessageType.UPDATE_LEADERBOARD: {
        const leaderboardMessage: leaderboardData = message;
        const updatedScores = extractLeaderboardMap(leaderboardMessage.data.leaderboard);
        currentScores = updatedScores;
        setScores(updatedScores);
        break;
      }

      // setting the client's game code
      case MessageType.SET_GAME_CODE: {
        console.log("gc");
        console.log(message.data.gameCode);
        setGameCode(message.data.gameCode);
        break;
      }

      // updating the set of orbs for the client's game
      case MessageType.SEND_ORBS: {
        gameState.orbs = new Set<OrbData>(message.data.orbSet);
        setGameState({ ...gameState });
        break;
      }

      // the client's snake increased in length (ate an orb)
      case MessageType.INCREASE_OWN_LENGTH: {
        console.log("increase own length message");
        const increaseLengthMessage: IncreaseOwnLengthMessage = message;
        const newBodyParts: Position[] =
          increaseLengthMessage.data.newBodyParts;
        const newGameState: GameState = { ...gameState };
        newBodyParts.forEach((bodyPart: Position) => {
          newGameState.snake.snakeBody.push(bodyPart);
        });
        setGameState(newGameState);
        break;
      }

      // another client's snake increased in length (ate an orb)
      case MessageType.INCREASE_OTHER_LENGTH: {
        const increaseLengthMessage: IncreaseOtherLengthMessage = message;
        const newBodyParts: Position[] =
          increaseLengthMessage.data.newBodyParts;
        const skinId: string = message.data.skinId || "astro";
        const newGameState: GameState = { ...gameState };
        newBodyParts.forEach((bodyPart: Position) => {
          const key = JSON.stringify(bodyPart);
          newGameState.otherBodies.add(key);
          newGameState.otherPlayerSkins.set(key, skinId);
        });
        setGameState(newGameState);
        break;
      }

      // the client's snake decreased in length (boosting)
      case MessageType.DECREASE_OWN_LENGTH: {
        console.log("decrease own length message");
        const count: number = message.data.count || 0;
        const newGameState: GameState = { ...gameState };
        // Remove segments from the tail
        for (let i = 0; i < count; i++) {
          newGameState.snake.snakeBody.pop();
        }
        setGameState(newGameState);
        break;
      }

      // another client's snake decreased in length (boosting)
      case MessageType.DECREASE_OTHER_LENGTH: {
        console.log("decrease other length message");
        const removedPositions: Position[] = message.data.removedPositions || [];
        const newGameState: GameState = { ...gameState };
        removedPositions.forEach((position: Position) => {
          const posKey = JSON.stringify(position);
          newGameState.otherBodies.delete(posKey);
          newGameState.otherPlayerSkins.delete(posKey);
        });
        setGameState(newGameState);
        break;
      }
    }
  };

  // if any error in the server occurs
  socket.onerror = () => setErrorText("Error: No server running!");
}

/**
 * Extracts and returns a map of users to their scores, from a server
 * websocket message
 * @param leaderboardData a list of leaderboard entries, from a server websocket message
 * @returns a map of users to their scores
 */
export function extractLeaderboardMap(leaderboardData: leaderboardEntry[]) {
  const leaderboard: Map<string, number> = new Map<string, number>();
  leaderboardData.forEach((entry: leaderboardEntry) => {
    leaderboard.set(entry.username, entry.score);
  });
  return leaderboard;
}

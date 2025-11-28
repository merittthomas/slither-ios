import { Dispatch, SetStateAction } from "react";

import GameState from "./GameState";
import GameCanvas from "./GameCanvas";
import Leaderboard from "../leaderboard/Leaderboard";
import GameCode from "../gameCode/GameCode";
import { getSkinById } from "./snake/SnakeSkins";

/**
 * An interface representing data passed to the HTML element responsible for
 * rendering the Slither+ game
 */
interface GameProps {
  /** A metadata representation of the current state of the game */
  gameState: GameState;
  /** A function that sets the current state of the game */
  setGameState: Dispatch<SetStateAction<GameState>>;
  /** A map from each user, as a string, to their score */
  scores: Map<string, number>;
  /** A map from each user, as a string, to their skin ID */
  playerSkins: Map<string, string>;
  /** The game code of the game current being played */
  gameCode: string;
  /** The client's websocket for communication with the Slither+ server */
  socket: WebSocket;
  /** The client's username */
  username: string;
}

/**
 * Returns an HTML element that renders the Slither+ game, which includes the
 * game canvas, which renders map, snakes, and orbs, as well as the leaderboard
 * with each user's score and the game code of the current lobby.
 * @param gameState A metadata representation of the current state of the game
 * @param setGameState A function that sets the current state of the game
 * @param scores A map from each user, as a string, to their score
 * @param gameCode The game code of the game current being played
 * @returns the rendered representation of the client's current Slither+ game
 */
export default function Game({
  gameState,
  setGameState,
  scores,
  playerSkins,
  gameCode,
  socket,
  username,
}: GameProps) {
  // Get the current player's skin color for the party code display
  const playerSkinColor = gameState.snake.skin?.color || getSkinById("astro").color;

  return (
    <div>
      <GameCanvas
        gameState={gameState}
        setGameState={setGameState}
        socket={socket}
        scores={scores}
        username={username}
      />
      <Leaderboard leaderboard={scores} playerSkins={playerSkins} />
      <GameCode gameCode={gameCode} skinColor={playerSkinColor} />
    </div>
  );
}

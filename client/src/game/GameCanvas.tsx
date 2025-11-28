import { useEffect, useRef, Dispatch, SetStateAction } from "react";

import GameState, { Position } from "./GameState";
import Snake, { SnakeData, SNAKE_VELOCITY } from "./snake/Snake";
import Orb, { OrbData } from "./orb/Orb";
import Border from "./boundary/Boundary";
import OtherSnake from "./snake/OtherSnake";

import { sendUpdatePositionWithBoostMessage } from "../message/message";

/**
 * The size of the map. The map is rendered centered on the origin, so
 * the map ranges from -x/2 to x/2 horiziontally, and -y/2 to y/2 vertically
 */
const canvasSize: Position = { x: 3000, y: 3000 };
/** The current position of the client's mouse on the screen */
const mousePos: Position = { x: 0, y: 0 };
/**
 * The offset from the coordinates of the client's snake's head to the
 * middle of the window
 */
const offset: Position = { x: 0, y: 0 };
/** Track which keys are currently pressed for keyboard controls */
const keysPressed: { [key: string]: boolean } = {};
/** Track if keyboard is active (to prioritize over mouse) */
let keyboardActive = false;
/** Track if mouse button is pressed (for boost) */
let mousePressed = false;
/** Track if boost is currently active */
let boostActive = false;
/** Track if we're in an active boost session (started with enough score) */
let boostSessionActive = false;
/** Minimum score required to START boosting */
const MIN_BOOST_SCORE = 10;
/** Track if boost keys are pressed (space, W, up arrow) */
const boostKeysPressed: { [key: string]: boolean } = {};

/**
 * An interface representing data passed to the HTML element responsible for
 * rendering the Slither+ game map
 */
interface GameCanvasProps {
  /** A metadata representation of the current state of the game */
  gameState: GameState;
  /** A function that sets the current state of the game */
  setGameState: Dispatch<SetStateAction<GameState>>;
  /** The client's websocket for communication with the Slither+ server */
  socket: WebSocket;
  /** A map from each user, as a string, to their score */
  scores: Map<string, number>;
  /** The client's username for score lookup */
  username: string;
}

/**
 * Returns an HTML element that renders the Slither+ game map, which includes
 * your snake, whose head is always at the screen's center, all other snakes in
 * the game, all existing orbs, and the map border.
 * @param gameState A metadata representation of the current state of the game
 * @param setGameState A function that sets the current state of the game
 * @param user The username of the client
 * @param websocket The client's websocket for communication with the Slither+ server
 * @returns a rendered representation of the current game map for the client
 */
export default function GameCanvas({
  gameState,
  setGameState,
  socket,
  scores,
  username,
}: GameCanvasProps): JSX.Element {
  // Use refs to track current values for use in setInterval callback
  const scoresRef = useRef(scores);
  const usernameRef = useRef(username);

  // Keep refs updated when props change
  useEffect(() => {
    scoresRef.current = scores;
    usernameRef.current = username;
  }, [scores, username]);

  const onMouseMove = (e: MouseEvent) => {
    mousePos.x = e.pageX;
    mousePos.y = e.pageY;
    keyboardActive = false; // Switch back to mouse control when mouse moves
  };

  const onMouseDown = () => {
    mousePressed = true;
  };

  const onMouseUp = () => {
    mousePressed = false;
  };

  const onKeyDown = (e: KeyboardEvent) => {
    const key = e.key.toLowerCase();
    // Movement keys (turning)
    if (['a', 's', 'd', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
      keysPressed[key] = true;
      keyboardActive = true;
      e.preventDefault(); // Prevent page scrolling with arrow keys
    }
    // Boost keys (space, W, up arrow)
    if (key === ' ' || key === 'w' || key === 'arrowup') {
      boostKeysPressed[key] = true;
      e.preventDefault();
    }
  };

  const onKeyUp = (e: KeyboardEvent) => {
    const key = e.key.toLowerCase();
    keysPressed[key] = false;
    boostKeysPressed[key] = false;
  };

  /** Check if boost is being requested via any input method */
  const isBoostRequested = (): boolean => {
    return mousePressed ||
           boostKeysPressed[' '] ||
           boostKeysPressed['w'] ||
           boostKeysPressed['arrowup'];
  };

  /** Get the current player's score */
  const getCurrentScore = (): number => {
    return scoresRef.current.get(usernameRef.current) || 0;
  };

  const updatePositions = () => {
    const newGameState: GameState = { ...gameState };
    const currentScore = getCurrentScore();
    const wantsBoost = isBoostRequested();

    // Boost session management:
    // - Need MIN_BOOST_SCORE to START a new boost session
    // - Once started, can continue while score > 0 and button held
    // - Session ends when button released OR score hits 0
    if (wantsBoost) {
      if (!boostSessionActive && currentScore >= MIN_BOOST_SCORE) {
        // Start new boost session
        boostSessionActive = true;
      }
      // Continue boosting if in session and have score
      boostActive = boostSessionActive && currentScore > 0;
    } else {
      // Button released - end session
      boostSessionActive = false;
      boostActive = false;
    }

    // Also end session if score hits 0
    if (currentScore <= 0) {
      boostSessionActive = false;
      boostActive = false;
    }

    // Move snake - when boosting, move twice per frame for 2x speed with same segment spacing
    let updatedSnake: SnakeData = moveSnake(gameState.snake, socket, boostActive);
    if (boostActive) {
      updatedSnake = moveSnake(updatedSnake, socket, boostActive);
    }
    // constantly update your own snake using moveSnake
    newGameState.snake = updatedSnake;
    setGameState(newGameState);
  };

  useEffect(() => {
    // updates position of the client's snake every 50 ms
    const interval = setInterval(updatePositions, 50);
    // updates mouse position when moved, determines target direction for snake
    window.addEventListener("mousemove", onMouseMove);
    // mouse click handlers for boost
    window.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mouseup", onMouseUp);
    // keyboard event listeners for WASD and arrow key controls
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    return () => {
      // clean up upon closing
      clearInterval(interval);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  // calculate offset to center snake on screen and place other objects relative to snake
  const front: Position | undefined = gameState.snake.snakeBody.peekFront();
  if (front !== undefined) {
    offset.x = window.innerWidth / 2 - front.x;
    offset.y = window.innerHeight / 2 - front.y;
  }

  return (
    <div>
      <Snake snake={gameState.snake} offset={offset} isBoosting={boostActive} />
      {Array.from(gameState.orbs).map((orb: OrbData, ind: number) => (
        <Orb orbInfo={orb} offset={offset} key={ind} />
      ))}
      <OtherSnake positions={gameState.otherBodies} offset={offset} skinMap={gameState.otherPlayerSkins} headMap={gameState.otherPlayerHeads} rotationMap={gameState.otherPlayerRotations} usernameMap={gameState.otherPlayerUsernames} boostingMap={gameState.otherPlayerBoosting} />
      <Border boundaries={canvasSize} offset={offset} />
    </div>
  );
}

/**
 * Gets the turn rate from keyboard input (left/right keys)
 * @returns turn rate in radians per frame (negative = left/counterclockwise, positive = right/clockwise), 0 if no turn keys pressed
 */
function getKeyboardTurnRate(): number {
  const TURN_RATE = 0.12; // radians per frame (~6.9 degrees)
  let turn = 0;

  // Left turn (counterclockwise = negative angle change)
  if (keysPressed['a'] || keysPressed['arrowleft']) turn -= TURN_RATE;
  // Right turn (clockwise = positive angle change)
  if (keysPressed['d'] || keysPressed['arrowright']) turn += TURN_RATE;

  return turn;
}

/**
 * Changes the given snake's velocity to follow the mouse's position or keyboard input,
 * and sends the new position to the Slither+ server
 * @param snake A metadata representation of the client's snake
 * @param socket The client's websocket for communication with the Slither+ server
 * @param isBoosting Whether the snake is currently boosting
 * @returns the newly updated metadata for the client's snake
 */
export function moveSnake(snake: SnakeData, socket: WebSocket, isBoosting: boolean = false): SnakeData {
  // remove last position from the end (to simulate movement)
  const removePosition: Position | undefined = snake.snakeBody.pop();
  const front: Position | undefined = snake.snakeBody.peekFront();
  if (front !== undefined) {
    let vel_angle: number = Math.atan2(snake.velocityY, snake.velocityX);

    if (keyboardActive) {
      // Keyboard mode: directly apply turn rate (continuous rotation while key held)
      const turnRate = getKeyboardTurnRate();
      vel_angle += turnRate;
    } else {
      // Mouse mode: turn toward mouse position
      const accel_angle = Math.atan2(
        mousePos.y - offset.y - front.y,
        mousePos.x - offset.x - front.x
      );

      const angle_diff = mod(accel_angle - vel_angle, 2 * Math.PI);

      // Adaptive turning: use smaller increments when close to target to prevent oscillation
      const MAX_TURN_RATE = 0.15; // radians per frame (~8.6 degrees)
      const MIN_ANGLE_DIFF = 0.015; // ~0.86 degrees - minimum difference to respond to

      // Normalize angle_diff to be in range [-π, π] for proper distance calculation
      let normalized_diff = angle_diff;
      if (normalized_diff > Math.PI) {
        normalized_diff = normalized_diff - 2 * Math.PI;
      }

      if (Math.abs(normalized_diff) > MIN_ANGLE_DIFF) {
        // Use adaptive turn rate: full speed for large angles, smaller for fine adjustments
        const turnAmount = Math.min(Math.abs(normalized_diff) / 2, MAX_TURN_RATE);
        vel_angle += normalized_diff > 0 ? turnAmount : -turnAmount;
      }
    }

    // calculate new velocity (constant speed - boost is achieved by moving more often)
    snake.velocityX = SNAKE_VELOCITY * Math.cos(vel_angle);
    snake.velocityY = SNAKE_VELOCITY * Math.sin(vel_angle);

    // find new position of head based on velocity
    const newPosition: Position = {
      x: front.x + snake.velocityX,
      y: front.y + snake.velocityY,
    };

    // add new position to the front (to simulate movement)
    snake.snakeBody.unshift({ x: newPosition.x, y: newPosition.y });

    if (removePosition !== undefined) {
      const toAdd: Position = {
        x: Number(newPosition.x.toFixed(2)),
        y: Number(newPosition.y.toFixed(2)),
      };
      const toRemove: Position = {
        x: Number(removePosition.x.toFixed(2)),
        y: Number(removePosition.y.toFixed(2)),
      };
      // send message to server with add and remove positions (include boost state)
      sendUpdatePositionWithBoostMessage(socket, toAdd, toRemove, isBoosting);
    }
  }
  return snake;
}

/**
 * Takes the modulo of the first argument by the second argument (n % m)
 * @param n the number whose modulo is being calculated
 * @param m the modulus of the operation
 */
export function mod(n: number, m: number): number {
  return ((n % m) + m) % m;
}

import React, { useState, Dispatch, SetStateAction } from "react";

import "./Home.css";

import { registerSocket } from "../App";
import GameState from "../game/GameState";
import { OrbData } from "../game/orb/Orb";
import HowToPlay from "./HowToPlay";

/**
 * Interface representing data for an HTML input that updates metadata based
 * on text editing and has some functionality on keys pressed.
 */
interface ControlledInputProps {
  /** A read-only value representing the value of the text input element. */
  value: string;
  /** A function that sets the value of the given read-only value. */
  setValue: Dispatch<SetStateAction<string>>;
  /** A function for the event the enter key is pressed. */
  onEnter: () => void;
  /** The text placeholder of the input HTML element. */
  placeholder: string;
  /** The class of the input HTML element. */
  className: string;
  /** Optional flag to convert input to uppercase. */
  uppercase?: boolean;
  /** Optional maximum length for the input. */
  maxLength?: number;
}

/**
 * Creates and returns an input HTML element that updates metadata based
 * on text editing and with a custom functionality for when the enter key
 * is pressed
 *
 * @param value a read-only value representing the value of the text input element
 * @param setValue a function that sets the given read-only value
 * @param onEnter a function called when the enter key is pressed
 * @param placeholder the text placeholder for the returned input HTML element
 * @param className the class of the returned input HTML element
 * @returns
 */
function ControlledInput({
  value,
  setValue,
  onEnter,
  placeholder,
  className,
  uppercase = false,
  maxLength,
}: ControlledInputProps): JSX.Element {
  return (
    <input
      value={value}
      onChange={(ev: React.ChangeEvent<HTMLInputElement>): void =>
        setValue(uppercase ? ev.target.value.toUpperCase() : ev.target.value)
      }
      onKeyDown={(ev: React.KeyboardEvent<HTMLInputElement>): void => {
        if (ev.key === "Enter") {
          onEnter();
        }
      }}
      placeholder={placeholder}
      className={className}
      maxLength={maxLength}
    ></input>
  );
}

/**
 * An interface representing data passed to the home page HTML element
 */
interface HomeProps {
  /** A function that sets whether or not the client has started playing the game */
  setGameStarted: Dispatch<SetStateAction<boolean>>;
  /** A function that sets the current leaderboard (set of scores) for the game */
  setScores: Dispatch<SetStateAction<Map<string, number>>>;
  /** A function that sets the game code for the lobby the client is playing in */
  setGameCode: Dispatch<SetStateAction<string>>;
  /** A metadata representation of the current state of the game */
  gameState: GameState;
  /** A function that sets the current state of the game */
  setGameState: Dispatch<SetStateAction<GameState>>;
  /** A list of all orbs stored in metadata form */
  orbSet: Set<OrbData>;
}

/**
 * Creates and returns the home page, rendering a button which displays
 * how-to-play instructions upon clicking, an input box for specifying one's
 * username, a button to create a new game, and an input box for specifying a
 * custom, already live game, with a button to join said game
 *
 * @param setGameStarted A function that sets whether or not the client has started playing the game
 * @param setScores A function that sets the current leaderboard (set of scores) for the game
 * @param setGameCode A function that sets the game code for the lobby the client is playing in
 * @param gameState A metadata representation of the current state of the game
 * @param setGameState A function that sets the current state of the game
 * @param orbSet A list of all orbs stored in metadata form
 * @returns the home page of the Slither+ game
 */
export default function Home({
  setGameStarted,
  setScores,
  setGameCode,
  gameState,
  setGameState,
  orbSet,
}: HomeProps): JSX.Element {
  const [username, setUsername] = useState("");
  const [inputGamecode, setInputGamecode] = useState("");
  const [errorText, setErrorText] = useState("");
  const [gameCodeErrorText, setGameCodeErrorText] = useState("");
  const [displayHowToPlay, setDisplayHowToPlay] = useState(false);

  // Check for last score from localStorage
  const lastScore = localStorage.getItem('lastScore');
  const usernamePrompt = lastScore
    ? `Last Score: ${lastScore}`
    : "Enter your username:";

  // validates username to prevent security risks
  const validateUsername = (name: string): boolean => {
    if (name.trim().length === 0) {
      setErrorText("Enter a username");
      return false;
    }
    // Only allow alphanumeric characters, spaces, hyphens, and underscores
    const validUsernameRegex = /^[a-zA-Z0-9\s_-]+$/;
    if (!validUsernameRegex.test(name)) {
      setErrorText("Username can only contain letters, numbers, spaces, hyphens, and underscores!");
      return false;
    }
    return true;
  };

  // registers the client's websocket to handle joining a new game
  const startNewGame = (): void => {
    if (!validateUsername(username)) {
      return;
    }
    setErrorText("");
    setGameCodeErrorText("");
    // Clear the last score when starting a new game
    localStorage.removeItem('lastScore');
    try {
      registerSocket(
        setScores,
        setGameStarted,
        setErrorText,
        setGameCode,
        orbSet,
        gameState,
        setGameState,
        username,
        gameState.snake.skin?.id || "astro",
        false
      );
    } catch (e) {
      // check server status
      setErrorText("Error: Could not connect to server!");
    }
  };

  // registers the client's websocket to handle joining a game with a code
  const startGameWithCode = (): void => {
    if (!validateUsername(username)) {
      setGameCodeErrorText("");
      return;
    }
    if (inputGamecode.trim().length === 0) {
      setErrorText("");
      setGameCodeErrorText("Enter a game code");
      return;
    }
    setErrorText("");
    setGameCodeErrorText("");
    // Clear the last score when starting a new game
    localStorage.removeItem('lastScore');
    try {
      registerSocket(
        setScores,
        setGameStarted,
        setErrorText,
        setGameCode,
        orbSet,
        gameState,
        setGameState,
        username,
        gameState.snake.skin?.id || "astro",
        true,
        inputGamecode
      );
    } catch (e) {
      // check server status
      setErrorText("Error: Could not connect to server!");
    }
  };

  return (
    <div className="main-container">
      <div className="how-to-play-display">
        {displayHowToPlay ? (
          <HowToPlay setDisplayHowToPlay={setDisplayHowToPlay} />
        ) : null}
      </div>
      <div className="HomeContainer">
        <button
          className="btn btn-light how-to-play-button"
          aria-label="How To Play button"
          onClick={() => setDisplayHowToPlay(true)}
        >
          How to play?
        </button>
        <h1 className="main-title">
          Slither
          <span className="title-ios" aria-label="Title: Slither.iOS">
            .iOS
          </span>
        </h1>
        <h2
          className="username-prompt"
          aria-label="Prompt: Enter your username"
        >
          {usernamePrompt}
        </h2>
        <div className="username-row">
          <ControlledInput
            value={username}
            setValue={setUsername}
            onEnter={() => {
              if (inputGamecode.length === 0) {
                startNewGame();
              } else {
                startGameWithCode();
              }
            }}
            placeholder="Player Name"
            className="username-input"
            aria-label="Username input box"
            maxLength={16}
          />
          <button
            className="btn btn-light new-game-button"
            aria-label="New Game Button"
            onClick={startNewGame}
          >
            Play
          </button>
          <p className="error-text">{errorText}</p>
        </div>
        <div className="or-text">OR</div>
        <h4
          className="join-with-gamecode-text"
          aria-label="Prompt: Join with a game code"
        >
          Join with a Game Code
        </h4>
        <div className="gamecode-row">
          <ControlledInput
            value={inputGamecode}
            setValue={setInputGamecode}
            onEnter={startGameWithCode}
            placeholder="XXXXXX"
            className="gamecode-input"
            aria-label="Gamecode input box"
            uppercase={true}
            maxLength={6}
          />
          <button
            className="btn btn-outline-light join-game-button"
            aria-label="Join game button"
            onClick={startGameWithCode}
          >
            Join
          </button>
          <p className="gamecode-error-text">{gameCodeErrorText}</p>
        </div>
      </div>
    </div>
  );
}

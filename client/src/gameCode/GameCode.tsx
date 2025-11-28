import "./GameCode.css";

/**
 * Renders the current lobby's game code, in the top left.
 * @param gameCode the lobby's game code
 * @param skinColor the player's skin color to use for the code text
 * @returns an HTML element rendering the lobby's game code
 */
export default function GameCode({
  gameCode,
  skinColor,
}: {
  gameCode: string;
  skinColor: string;
}): JSX.Element {
  return (
    <div className="codeDisplay">
      <p className="code-tagline">Party Code: <span className="codeText" style={{ color: skinColor }}>{gameCode}</span></p>
    </div>
  );
}

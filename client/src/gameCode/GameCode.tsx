import "./GameCode.css";

/**
 * Renders the current lobby's game code, in the top left.
 * @param gameCode the lobby's game code
 * @returns an HTML element rendering the lobby's game code
 */
export default function GameCode({
  gameCode,
}: {
  gameCode: string;
}): JSX.Element {
  return (
    <div className="codeDisplay">
      <p className="code-tagline">Party Code: <span className="codeText">{gameCode}</span></p>
    </div>
  );
}

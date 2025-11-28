import { Position } from "../GameState";
import { calculateSnakeScale, BASE_SNAKE_SIZE } from "../snake/SnakeScaling";
import "./Boundary.css";

/**
 * Calculate the collision radius for a snake based on score.
 * This matches the server-side SnakeScaling.calculateCollisionRadius formula.
 * @param score The player's current score
 * @returns Collision radius in pixels (from 17.5 to 35 as scale goes from 1.0 to 2.0)
 */
function calculateCollisionRadius(score: number): number {
  const scale = calculateSnakeScale(score);
  return (BASE_SNAKE_SIZE / 2.0) * scale;
}

/**
 * Renders the boundary for the map, with 4 borders placed according to the
 * given limits with the map centered at (0, 0), and offsetted on screen by
 * the given amount. The boundary is drawn inward by the snake collision radius
 * so it accurately shows where death occurs.
 * @param boundaries the size of the map
 * @param offset the offset at which to renders the boundaries
 * @param score the player's current score (for dynamic collision radius)
 * @returns an HTML element rendering the map's boundary
 */
export default function Boundary({
  boundaries,
  offset,
  score = 0,
}: {
  boundaries: Position;
  offset: Position;
  score?: number;
}): JSX.Element {
  // Calculate dynamic collision radius based on player's score
  const collisionRadius = calculateCollisionRadius(score);

  // Effective boundary is reduced by snake radius on each side
  const effectiveWidth = boundaries.x - 2 * collisionRadius;
  const effectiveHeight = boundaries.y - 2 * collisionRadius;

  return (
    <div>
      <div
        className="boundary"
        id="top-boundary"
        style={{
          left: offset.x - effectiveWidth / 2,
          top: offset.y - effectiveHeight / 2,
          width: effectiveWidth + "px",
          height: "0px",
        }}
      />
      <div
        className="boundary"
        id="bottom-boundary"
        style={{
          left: offset.x - effectiveWidth / 2,
          top: offset.y + effectiveHeight / 2,
          width: effectiveWidth + "px",
          height: "0px",
        }}
      />
      <div
        className="boundary"
        id="left-boundary"
        style={{
          left: offset.x - effectiveWidth / 2,
          top: offset.y - effectiveHeight / 2,
          width: "0px",
          height: effectiveHeight + "px",
        }}
      />
      <div
        className="boundary"
        id="right-boundary"
        style={{
          left: offset.x + effectiveWidth / 2,
          top: offset.y - effectiveHeight / 2,
          width: "0px",
          height: effectiveHeight + "px",
        }}
      />
    </div>
  );
}

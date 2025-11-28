import Denque from "denque";
import "./Snake.css";
import { Position } from "../GameState";
import { SnakeSkin } from "./SnakeSkins";

/** A metadata representation of a snake */
export interface SnakeData {
  /**
   * A collection of positions, specifying the locations of the
   * circles making up the snake's body
   */
  snakeBody: Denque<Position>;
  /** The velocity of the snake in the horizontal direction */
  velocityX: number;
  /** The velocity of the snake in the vertical direction */
  velocityY: number;
  /** The skin/appearance of the snake */
  skin?: SnakeSkin;
}

/** The constant velocity at which a snake moves */
export const SNAKE_VELOCITY = 8;

/**
 * Calculates the rotation angle for the snake head based on velocity
 * @param velocityX horizontal velocity
 * @param velocityY vertical velocity
 * @returns rotation angle in degrees
 */
function calculateHeadRotation(velocityX: number, velocityY: number): number {
  // Calculate angle in radians, then convert to degrees
  const angleRadians = Math.atan2(velocityY, velocityX);
  const angleDegrees = angleRadians * (180 / Math.PI);
  return angleDegrees;
}

/**
 * Converts hex color to HSL
 * @param hex The hex color code (e.g., "#EA3D3D")
 * @returns HSL values as [h, s, l] where h is 0-360, s and l are 0-100
 */
function hexToHSL(hex: string): [number, number, number] {
  const cleanHex = hex.replace("#", "");
  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  let h = 0;
  let s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

/**
 * Adjusts a hex color by decreasing brightness and increasing saturation
 * @param hex The hex color code (e.g., "#EA3D3D")
 * @returns HSL color string with adjusted brightness and saturation
 */
function adjustColorForGradient(hex: string): string {
  const [h, s, l] = hexToHSL(hex);

  // For grey (low saturation colors), don't increase saturation to avoid color shift
  const isGrey = s < 10;
  const newS = isGrey ? s : Math.min(100, s + 25);

  // Decrease brightness by 10%
  const newL = Math.max(0, l - 10);

  return `hsl(${h}, ${newS}%, ${newL}%)`;
}

/**
 * Renders the given snake, represented by its metadata, on screen at the
 * given position offset; a snake is rendered as a consecutive collection of circles
 * @param snake a metadata representation of a snake
 * @param offset the offset at which the snake is to be rendered
 * @returns a HTML element rendering the given snake
 */
export default function Snake({
  snake,
  offset,
}: {
  snake: SnakeData;
  offset: Position;
}): JSX.Element {
  const bodyArray = snake.snakeBody.toArray();
  const headRotation = calculateHeadRotation(snake.velocityX, snake.velocityY);

  // Get skin color, default to white if no skin is set
  const skinColor = snake.skin?.color || "#FFFFFF";
  const headImageSrc = snake.skin?.headImage || "/assets/snake-head.png";
  const darkerColor = adjustColorForGradient(skinColor);

  return (
    <div>
      {bodyArray.map((bodyPart: Position, ind: number) => {
        const isHead = ind === 0;
        // Head gets highest z-index, each segment gets progressively lower
        const zIndex = bodyArray.length - ind;

        if (isHead) {
          // Render head as image with rotation and background color
          return (
            <img
              className="snake-head"
              key={ind}
              src={headImageSrc}
              alt="snake head"
              style={{
                left: bodyPart.x + offset.x,
                top: bodyPart.y + offset.y,
                transform: `translate(-50%, -50%) rotate(${headRotation}deg)`,
                background: `radial-gradient(circle at center, ${skinColor}, ${darkerColor})`,
                zIndex: zIndex,
              }}
            />
          );
        } else {
          // Render body segments as circles with radial gradient
          return (
            <div
              className="snake"
              key={ind}
              style={{
                left: bodyPart.x + offset.x,
                top: bodyPart.y + offset.y,
                background: `radial-gradient(circle at center, ${skinColor}, ${darkerColor})`,
                borderColor: darkerColor,
                zIndex: zIndex,
              }}
            />
          );
        }
      })}
    </div>
  );
}

import Denque from "denque";
import { useRef } from "react";
import "./Snake.css";
import { Position } from "../GameState";
import { SnakeSkin } from "./SnakeSkins";
import { calculateSnakeScale } from "./SnakeScaling";

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

  // Decrease brightness by 15%
  const newL = Math.max(0, l - 15);

  return `hsl(${h}, ${newS}%, ${newL}%)`;
}

/**
 * Renders the given snake, represented by its metadata, on screen at the
 * given position offset; a snake is rendered as a consecutive collection of circles
 * @param snake a metadata representation of a snake
 * @param offset the offset at which the snake is to be rendered
 * @param isBoosting whether the snake is currently boosting (for glow effect)
 * @returns a HTML element rendering the given snake
 */
export default function Snake({
  snake,
  offset,
  isBoosting = false,
  score = 0,
}: {
  snake: SnakeData;
  offset: Position;
  isBoosting?: boolean;
  score?: number;
}): JSX.Element {
  const bodyArray = snake.snakeBody.toArray();
  const lastRotationRef = useRef<number>(0);
  const scale = calculateSnakeScale(score);

  // Calculate rotation based on actual body positions
  let headRotation = lastRotationRef.current;

  if (bodyArray.length >= 2) {
    const head = bodyArray[0];
    const neck = bodyArray[1];

    const dx = head.x - neck.x;
    const dy = head.y - neck.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Only update rotation if moving significantly
    if (distance > 2) {
      const angleRadians = Math.atan2(dy, dx);
      const angleDegrees = angleRadians * (180 / Math.PI);

      // Only update if angle changed by more than 1 degree
      const angleDiff = Math.abs(angleDegrees - lastRotationRef.current);
      if (angleDiff > 1 && angleDiff < 359) {
        lastRotationRef.current = angleDegrees;
        headRotation = angleDegrees;
      }
    }
  }

  // Get skin color, default to white if no skin is set
  const skinColor = snake.skin?.color || "#FFFFFF";
  const headImageSrc = snake.skin?.headImage || "/assets/snake-head.png";
  const darkerColor = adjustColorForGradient(skinColor);

  // Boost glow effect - creates a pulsing glow around the snake when boosting
  const boostGlow = isBoosting
    ? `0 0 15px ${skinColor}, 0 0 30px ${skinColor}, 0 0 45px ${skinColor}`
    : "none";

  return (
    <div>
      {bodyArray.map((bodyPart: Position, ind: number) => {
        const isHead = ind === 0;
        // Head gets highest z-index, each segment gets progressively lower
        const zIndex = bodyArray.length - ind;

        if (isHead) {
          // Render head as layered elements: circular background + image on top
          return (
            <div
              className="snake-head-container"
              key={ind}
              style={{
                left: bodyPart.x + offset.x,
                top: bodyPart.y + offset.y,
                zIndex: zIndex,
                transform: `translate(-50%, -50%) scale(${scale})`,
              }}
            >
              {/* Circular gradient background */}
              <div
                className={`snake-head-bg ${isBoosting ? "boosting" : ""}`}
                style={{
                  background: `radial-gradient(circle at center, ${skinColor}, ${darkerColor})`,
                  borderColor: darkerColor,
                  transform: `rotate(${headRotation}deg)`,
                  boxShadow: boostGlow,
                }}
              />
              {/* Head image on top - no border-radius */}
              <img
                className={`snake-head ${isBoosting ? "boosting" : ""}`}
                src={headImageSrc}
                alt="snake head"
                style={{
                  transform: `rotate(${headRotation}deg)`,
                }}
              />
            </div>
          );
        } else {
          // Render body segments as circles with radial gradient
          return (
            <div
              className={`snake ${isBoosting ? "boosting" : ""}`}
              key={ind}
              style={{
                left: bodyPart.x + offset.x,
                top: bodyPart.y + offset.y,
                background: `radial-gradient(circle at center, ${skinColor}, ${darkerColor})`,
                borderColor: darkerColor,
                zIndex: zIndex,
                boxShadow: boostGlow,
                transform: `translate(-50%, -50%) scale(${scale})`,
              }}
            />
          );
        }
      })}
    </div>
  );
}

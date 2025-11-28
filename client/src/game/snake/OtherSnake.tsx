import { Position } from "../GameState";
import { getSkinById } from "./SnakeSkins";
import { calculateSnakeScale } from "./SnakeScaling";

/**
 * Converts hex color to HSL
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
 */
function adjustColorForGradient(hex: string): string {
  const [h, s, l] = hexToHSL(hex);
  const isGrey = s < 10;
  const newS = isGrey ? s : Math.min(100, s + 25);
  const newL = Math.max(0, l - 15);
  return `hsl(${h}, ${newS}%, ${newL}%)`;
}

/**
 * Lightens a hex color for use as border with 25% opacity
 */
function lightenColorForBorder(hex: string): string {
  const [h, s, l] = hexToHSL(hex);
  const newL = Math.min(100, l + 20);
  return `hsla(${h}, ${s}%, ${newL}%, 0.25)`;
}

/**
 * Renders all other snakes, given a set of each segment's positions (serialized
 * as JSON) - renders a circle for every single position to render them.
 * @param positions the serialized positions of all the other snakes
 * @param offset the offset at which the snake it to be rendered
 * @param skinMap a map from position JSON string to skinId for coloring
 * @param headMap a map from skinId to head position JSON string
 * @param rotationMap a map from skinId to head rotation angle (degrees)
 * @param usernameMap a map from skinId to username for name tags
 * @param boostingMap a map from skinId to boosting state
 * @returns a rendering of all other snake positions on screen
 */
export default function OtherSnake({
  positions,
  offset,
  skinMap,
  headMap,
  rotationMap,
  usernameMap,
  boostingMap,
  scores,
}: {
  positions: Set<string>;
  offset: Position;
  skinMap: Map<string, string>;
  headMap: Map<string, string>;
  rotationMap: Map<string, number>;
  usernameMap: Map<string, string>;
  boostingMap: Map<string, boolean>;
  scores: Map<string, number>;
}): JSX.Element {
  // Create a set of head positions for quick lookup
  const headPositions = new Set(headMap.values());

  // Group positions by skinId (player) to apply segment skip per-player
  const positionsBySkin: Map<string, string[]> = new Map();
  Array.from(positions).forEach((posString: string) => {
    const skinId = skinMap.get(posString) || "astro";
    if (!positionsBySkin.has(skinId)) {
      positionsBySkin.set(skinId, []);
    }
    positionsBySkin.get(skinId)!.push(posString);
  });

  // Flatten back to renderable elements with per-player segment skipping
  const elements: JSX.Element[] = [];

  positionsBySkin.forEach((playerPositions, skinId) => {
    const skin = getSkinById(skinId);
    const username = usernameMap.get(skinId) || "";
    const playerScore = scores.get(username) || 0;
    const scale = calculateSnakeScale(playerScore);
    const isBoosting = boostingMap.get(skinId) || false;
    const darkerColor = adjustColorForGradient(skin.color);
    const lighterColor = lightenColorForBorder(skin.color);

    // Calculate render interval based on scale (same logic as Snake.tsx)
    const renderInterval = Math.max(1, Math.round((scale - 1) * 2));

    // Boost glow effect
    const boostGlow = isBoosting
      ? `0 0 15px ${skin.color}, 0 0 30px ${skin.color}, 0 0 45px ${skin.color}`
      : "none";

    playerPositions.forEach((posString: string, index: number) => {
      const bodyPart: Position = JSON.parse(posString);
      const isHead = headPositions.has(posString);

      // For body segments (not head), skip based on renderInterval
      // Keep first segment (index 0, near head) and apply interval to rest
      if (!isHead && index > 0 && index % renderInterval !== 0) {
        return; // Skip this segment
      }

      if (isHead) {
        // Get rotation for this player's head
        const rotation = rotationMap.get(skinId) || 0;
        // Render head as layered elements: circular background + image on top
        elements.push(
          <div key={`${skinId}-head`}>
            {/* Name tag above head */}
            {username && (
              <div
                className="player-name-tag"
                style={{
                  left: bodyPart.x + offset.x,
                  top: bodyPart.y + offset.y - 60,
                }}
              >
                {username}
              </div>
            )}
            <div
              className="other-snake-head-container"
              style={{
                left: bodyPart.x + offset.x,
                top: bodyPart.y + offset.y,
                zIndex: 1000,
                transform: `translate(-50%, -50%) scale(${scale})`,
              }}
            >
              {/* Circular gradient background */}
              <div
                className={`other-snake-head-bg ${isBoosting ? "boosting" : ""}`}
                style={{
                  background: `radial-gradient(circle at center, ${skin.color}, ${darkerColor})`,
                  border: `${0.35}px solid ${lighterColor}`,
                  transform: `rotate(${rotation}deg)`,
                  boxShadow: boostGlow,
                }}
              />
              {/* Head image on top - no border-radius */}
              <img
                className={`other-snake-head ${isBoosting ? "boosting" : ""}`}
                src={skin.headImage}
                alt="snake head"
                style={{
                  transform: `rotate(${rotation}deg)`,
                }}
              />
            </div>
          </div>
        );
      } else {
        // Render body segment
        elements.push(
          <div
            key={`${skinId}-${index}`}
            className={`other-snake ${isBoosting ? "boosting" : ""}`}
            style={{
              left: bodyPart.x + offset.x,
              top: bodyPart.y + offset.y,
              background: `radial-gradient(circle at center, ${skin.color}, ${darkerColor})`,
              border: `${0.35}px solid ${lighterColor}`,
              boxShadow: boostGlow,
              transform: `translate(-50%, -50%) scale(${scale})`,
            }}
          ></div>
        );
      }
    });
  });

  return <div>{elements}</div>;
}

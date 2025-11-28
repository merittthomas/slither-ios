import { Position } from "../GameState";
import { getSkinById } from "./SnakeSkins";

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
}: {
  positions: Set<string>;
  offset: Position;
  skinMap: Map<string, string>;
  headMap: Map<string, string>;
  rotationMap: Map<string, number>;
  usernameMap: Map<string, string>;
  boostingMap: Map<string, boolean>;
}): JSX.Element {
  // Create a set of head positions for quick lookup
  const headPositions = new Set(headMap.values());

  return (
    <div>
      {Array.from(positions).map((posString: string, index: number) => {
        const bodyPart: Position = JSON.parse(posString);
        const skinId = skinMap.get(posString) || "astro";
        const skin = getSkinById(skinId);
        const isHead = headPositions.has(posString);
        const darkerColor = adjustColorForGradient(skin.color);
        const isBoosting = boostingMap.get(skinId) || false;

        // Boost glow effect
        const boostGlow = isBoosting
          ? `0 0 15px ${skin.color}, 0 0 30px ${skin.color}, 0 0 45px ${skin.color}`
          : "none";

        if (isHead) {
          // Get rotation and username for this player's head
          const rotation = rotationMap.get(skinId) || 0;
          const username = usernameMap.get(skinId) || "";
          // Render head as layered elements: circular background + image on top
          return (
            <div key={index}>
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
                }}
              >
                {/* Circular gradient background */}
                <div
                  className={`other-snake-head-bg ${isBoosting ? "boosting" : ""}`}
                  style={{
                    background: `radial-gradient(circle at center, ${skin.color}, ${darkerColor})`,
                    borderColor: darkerColor,
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
          // Render body segment (using other-snake for smooth transitions)
          return (
            <div
              key={index}
              className={`other-snake ${isBoosting ? "boosting" : ""}`}
              style={{
                left: bodyPart.x + offset.x,
                top: bodyPart.y + offset.y,
                background: `radial-gradient(circle at center, ${skin.color}, ${darkerColor})`,
                borderColor: darkerColor,
                boxShadow: boostGlow,
              }}
            ></div>
          );
        }
      })}
    </div>
  );
}

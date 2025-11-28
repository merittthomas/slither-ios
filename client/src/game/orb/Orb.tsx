import { Position } from "../GameState";
import "./orb.css";

/** A metadata representation of the orb */
export interface OrbData {
  /** The position of the orb on the map */
  position: Position;
  /** The size of the orb, as an enum */
  orbSize: OrbSize;
  /** The hexidecimal color of the orb, serialized as a string */
  color: string;
}

/** An enum representing the possible orb sizes */
export enum OrbSize {
  SMALL = "SMALL",
  MEDIUM = "MEDIUM",
  LARGE = "LARGE",
}

/**
 * Renders an orb appropriately according to the given metadata (position,
 * size, and color), at the given offset on the map.
 * @param orbInfo the metadata representation of the orb
 * @param offset the offset at which to render the orb
 * @returns a HTML element rendering of the orb
 */
/** Get the pixel size for an orb based on its OrbSize */
function getOrbPixelSize(orbSize: OrbSize): number {
  switch (orbSize) {
    case OrbSize.SMALL:
      return 7.5;
    case OrbSize.MEDIUM:
      return 15;
    case OrbSize.LARGE:
      return 30;
  }
}

export default function Orb({
  orbInfo,
  offset,
}: {
  orbInfo: OrbData;
  offset: Position;
}): JSX.Element {
  const size = getOrbPixelSize(orbInfo.orbSize);
  return (
    <div
      className="circle"
      style={{
        top: `${orbInfo.position.y + offset.y}px`,
        left: `${orbInfo.position.x + offset.x}px`,
        height: `${size}px`,
        width: `${size}px`,
        backgroundColor: `${orbInfo.color}`,
      }}
    ></div>
  );
}

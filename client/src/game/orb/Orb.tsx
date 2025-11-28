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

/**
 * Renders an orb appropriately according to the given metadata (position,
 * size, and color), at the given offset on the map.
 * @param orbInfo the metadata representation of the orb
 * @param offset the offset at which to render the orb
 * @returns a HTML element rendering of the orb
 */
export default function Orb({
  orbInfo,
  offset,
}: {
  orbInfo: OrbData;
  offset: Position;
}): JSX.Element {
  const size = getOrbPixelSize(orbInfo.orbSize);
  const darkerColor = adjustColorForGradient(orbInfo.color);
  const borderColor = lightenColorForBorder(orbInfo.color);

  return (
    <div
      className="circle"
      style={{
        top: `${orbInfo.position.y + offset.y}px`,
        left: `${orbInfo.position.x + offset.x}px`,
        height: `${size}px`,
        width: `${size}px`,
        background: `radial-gradient(circle at center, ${orbInfo.color}, ${darkerColor})`,
        border: `0.35px solid ${borderColor}`,
      }}
    ></div>
  );
}

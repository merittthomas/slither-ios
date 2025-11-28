/** Snake skin configuration with names, colors, and head image paths */
export interface SnakeSkin {
  /** Unique identifier for the skin */
  id: string;
  /** Display name of the skin */
  name: string;
  /** Hex color code for the snake body */
  color: string;
  /** Path to the head image asset */
  headImage: string;
}

/** Available snake skins with their color configurations */
export const SNAKE_SKINS: SnakeSkin[] = [
  {
    id: "astro",
    name: "Astro",
    color: "#EA3D3D",
    headImage: "/assets/skins/1-astro.png",
  },
  {
    id: "beta",
    name: "Beta",
    color: "#EA8A3D",
    headImage: "/assets/skins/2-beta.png",
  },
  {
    id: "comet",
    name: "Comet",
    color: "#EAD83D",
    headImage: "/assets/skins/3-comet.png",
  },
  {
    id: "delta",
    name: "Delta",
    color: "#55EA3D",
    headImage: "/assets/skins/4-delta.png",
  },
  {
    id: "eclipse",
    name: "Eclipse",
    color: "#3DABEA",
    headImage: "/assets/skins/5-eclipse.png",
  },
  {
    id: "flare",
    name: "Flare",
    color: "#3D45EA",
    headImage: "/assets/skins/6-flare.png",
  },
  {
    id: "gamma",
    name: "Gamma",
    color: "#8A3DEA",
    headImage: "/assets/skins/7-gamma.png",
  },
  {
    id: "helio",
    name: "Helio",
    color: "#E43DEA",
    headImage: "/assets/skins/8-helio.png",
  },
  {
    id: "ion",
    name: "Ion",
    color: "#888888",
    headImage: "/assets/skins/9-ion.png",
  },
];

/**
 * Gets a random snake skin from the available skins
 * @returns a randomly selected snake skin
 */
export function getRandomSkin(): SnakeSkin {
  const randomIndex = Math.floor(Math.random() * SNAKE_SKINS.length);
  return SNAKE_SKINS[randomIndex];
}

/**
 * Gets a skin by its ID
 * @param id the skin identifier
 * @returns the matching skin, or the first skin if not found
 */
export function getSkinById(id: string): SnakeSkin {
  return SNAKE_SKINS.find((skin) => skin.id === id) || SNAKE_SKINS[0];
}

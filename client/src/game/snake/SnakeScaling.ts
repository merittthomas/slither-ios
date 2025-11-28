/**
 * Snake scaling utilities for score-based visual size changes
 */

// Base snake segment size in pixels
export const BASE_SNAKE_SIZE = 35;

// Maximum scale factor (4x = 140px at max)
export const MAX_SNAKE_SCALE = 4.0;

// Size increase per point (0.05px per point, hits max at 1400 points)
export const SCALE_FACTOR = 0.05;

/**
 * Calculate the CSS transform scale factor for a snake based on its score.
 * Snake size grows linearly with score up to a maximum of 3x the base size.
 *
 * @param score The player's current score
 * @returns Scale factor from 1.0 to MAX_SNAKE_SCALE
 */
export function calculateSnakeScale(score: number): number {
  // Linear growth: 35px + (score * 0.05), capped at 105px
  const size = Math.min(
    BASE_SNAKE_SIZE * MAX_SNAKE_SCALE,
    BASE_SNAKE_SIZE + score * SCALE_FACTOR
  );
  return size / BASE_SNAKE_SIZE;
}

// Camera zoom constants
export const MIN_CAMERA_ZOOM = 0.5; // Maximum zoom-out (at max snake scale)
export const MAX_CAMERA_ZOOM = 1.0; // No zoom (at base snake size)

/**
 * Calculate the camera zoom level based on snake scale.
 * Larger snakes get a more zoomed-out view to see more of the game world.
 *
 * @param snakeScale The current snake scale (1.0 to MAX_SNAKE_SCALE)
 * @returns Camera zoom factor from MAX_CAMERA_ZOOM (1.0) to MIN_CAMERA_ZOOM (0.5)
 */
export function calculateCameraZoom(snakeScale: number): number {
  // Inverse relationship: larger snake = more zoom out
  const zoomRange = MAX_CAMERA_ZOOM - MIN_CAMERA_ZOOM;
  const scaleRange = MAX_SNAKE_SCALE - 1.0;
  const normalizedScale = (snakeScale - 1.0) / scaleRange;
  return MAX_CAMERA_ZOOM - normalizedScale * zoomRange;
}

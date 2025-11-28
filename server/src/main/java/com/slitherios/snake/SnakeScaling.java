package com.slitherios.snake;

/**
 * Utility class for calculating snake scaling based on score.
 * This mirrors the client-side SnakeScaling.ts logic to ensure
 * visual size and collision hitbox are in sync.
 */
public class SnakeScaling {

    // Base snake segment size in pixels (same as client)
    public static final double BASE_SNAKE_SIZE = 35.0;

    // Maximum scale factor (3x = 105px at max, 150% increase from previous 2x)
    public static final double MAX_SNAKE_SCALE = 3.0;

    // Size increase per point (0.05px per point, hits max at 1400 points)
    public static final double SCALE_FACTOR = 0.05;

    // Base points required per segment at score 0
    public static final double BASE_POINTS_PER_SEGMENT = 2.0;

    // Maximum points required per segment (at high scores)
    public static final double MAX_POINTS_PER_SEGMENT = 5.0;

    // Score at which max points per segment is reached
    public static final double DIMINISHING_RETURNS_CAP_SCORE = 2000.0;

    /**
     * Calculate the scale factor for a snake based on its score.
     * Snake size grows linearly with score up to a maximum of 3x the base size.
     *
     * @param score The player's current score
     * @return Scale factor from 1.0 to MAX_SNAKE_SCALE
     */
    public static double calculateSnakeScale(int score) {
        // Linear growth: 35px + (score * 0.05), capped at 105px
        double size = Math.min(
            BASE_SNAKE_SIZE * MAX_SNAKE_SCALE,
            BASE_SNAKE_SIZE + score * SCALE_FACTOR
        );
        return size / BASE_SNAKE_SIZE;
    }

    /**
     * Calculate the collision radius for a snake based on its score.
     * This is the actual radius used for collision detection, scaled
     * to match the visual appearance.
     *
     * @param score The player's current score
     * @return Collision radius in pixels (from 17.5 to 52.5 as scale goes from 1.0 to 3.0)
     */
    public static double calculateCollisionRadius(int score) {
        double scale = calculateSnakeScale(score);
        return (BASE_SNAKE_SIZE / 2.0) * scale;
    }

    /**
     * Calculate the points required to gain one body segment based on current score.
     * Implements diminishing returns - larger snakes need more points per segment.
     *
     * At score 0: 2 points per segment
     * At score 2000+: 5 points per segment
     * Linear interpolation between
     *
     * @param score The player's current score
     * @return Points required to gain one body segment
     */
    public static double calculatePointsPerSegment(int score) {
        if (score >= DIMINISHING_RETURNS_CAP_SCORE) {
            return MAX_POINTS_PER_SEGMENT;
        }
        // Linear interpolation from BASE to MAX based on score
        double ratio = score / DIMINISHING_RETURNS_CAP_SCORE;
        return BASE_POINTS_PER_SEGMENT + (MAX_POINTS_PER_SEGMENT - BASE_POINTS_PER_SEGMENT) * ratio;
    }
}

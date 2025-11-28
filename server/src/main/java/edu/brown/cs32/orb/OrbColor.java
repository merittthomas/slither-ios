package edu.brown.cs32.orb;

import java.util.Map;
import java.util.Random;

/**
 * OrbColor abstract class to allow for pseudo-random orb-color generation
 */
public abstract class OrbColor {

    // Map of skinId to hex color (matching client-side SnakeSkins.ts)
    private static final Map<String, String> SKIN_COLORS = Map.of(
        "astro", "#EA3D3D",
        "beta", "#EA8A3D",
        "comet", "#EAD83D",
        "delta", "#55EA3D",
        "eclipse", "#3DABEA",
        "flare", "#3D45EA",
        "gamma", "#8A3DEA",
        "helio", "#E43DEA",
        "ion", "#888888"
    );

    /**
     * Pseudo-randomly generates an orb color from snake skin colors
     * @return the hexidecimal string representing the color value to which an orb should be assigned
     */
    public static String generate() {
        // Using the same colors as snake skins for consistency
        final String[] colors = { "EA3D3D", "EA8A3D", "EAD83D", "55EA3D", "3DABEA", "3D45EA", "8A3DEA", "E43DEA", "888888" };
        Random random = new Random();

        return "#" + colors[random.nextInt(0, colors.length)];
    }

    /**
     * Gets the hex color for a given skin ID
     * @param skinId the skin identifier
     * @return the hexidecimal color string for the skin, or default red if not found
     */
    public static String getColorForSkin(String skinId) {
        return SKIN_COLORS.getOrDefault(skinId, "#EA3D3D");
    }
}

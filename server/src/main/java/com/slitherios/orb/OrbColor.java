package com.slitherios.orb;

import java.util.Map;
import java.util.Random;

/**
 * OrbColor abstract class to allow for pseudo-random orb-color generation
 */
public abstract class OrbColor {

    // Map of skinId to hex color (matching client-side SnakeSkins.ts)
    private static final Map<String, String> SKIN_COLORS = Map.of(
        "music", "#ff254f",
        "games", "#fe4e3e",
        "invites", "#f8dc1f",
        "numbers", "#05e216",
        "appstore", "#1c8bf3",
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
        final String[] colors = { "ff254f", "fe4e3e", "f8dc1f", "05e216", "1c8bf3", "3D45EA", "8A3DEA", "E43DEA", "888888" };
        Random random = new Random();

        return "#" + colors[random.nextInt(0, colors.length)];
    }

    /**
     * Gets the hex color for a given skin ID
     * @param skinId the skin identifier
     * @return the hexidecimal color string for the skin, or default red if not found
     */
    public static String getColorForSkin(String skinId) {
        return SKIN_COLORS.getOrDefault(skinId, "#ff254f");
    }
}

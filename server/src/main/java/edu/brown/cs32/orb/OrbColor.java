package edu.brown.cs32.orb;

import java.util.Random;

/**
 * OrbColor abstract class to allow for pseudo-random orb-color generation
 */
public abstract class OrbColor {

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
}

import React from "react";
import { getSkinById } from "../game/snake/SnakeSkins";
import "./Leaderboard.css";

/**
 * Converts hex color to HSL
 * @param hex The hex color code (e.g., "#EA3D3D")
 * @returns HSL values as [h, s, l] where h is 0-360, s and l are 0-100
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
 * Adjusts a color for leaderboard text: lightens by 20% and increases saturation by 40%
 * (except for greyish colors which don't get saturation boost to avoid color shift)
 * @param hex The hex color code (e.g., "#EA3D3D")
 * @returns HSL color string with adjusted lightness and saturation
 */
function adjustColorForLeaderboard(hex: string): string {
  const [h, s, l] = hexToHSL(hex);

  // For grey (low saturation colors), don't increase saturation to avoid color shift
  const isGrey = s < 10;
  const newS = isGrey ? s : Math.min(100, s + 40);

  // Increase lightness by 20% (move toward 100)
  const newL = Math.min(100, l + (100 - l) * 0.2);

  return `hsl(${h}, ${newS}%, ${newL}%)`;
}

/**
 * Displays the current lobby's leaderboard, in the top right.
 * Shows top 10 players with rank numbers. If the current player
 * is not in top 10, they appear as an 11th entry with their actual rank.
 * @param leaderboard a map of each user in the lobby to their score
 * @param playerSkins a map of each user in the lobby to their skin ID
 * @returns a HTML element rendering the leaderboard
 */
export default function Leaderboard({
  leaderboard,
  playerSkins,
}: {
  leaderboard: Map<string, number>;
  playerSkins: Map<string, string>;
}): JSX.Element {
  // Get current user's username from localStorage
  const currentUsername = localStorage.getItem("currentUsername") || "";

  // Sort entries by score (descending)
  let leaderboardEntries: [string, number][] = Array.from(
    leaderboard.entries()
  );
  leaderboardEntries = leaderboardEntries.sort(
    (a: [string, number], b: [string, number]) => (a[1] > b[1] ? -1 : 1)
  );

  // Find current player's rank (1-indexed)
  const currentPlayerRank =
    leaderboardEntries.findIndex(([username]) => username === currentUsername) +
    1;

  // Get top 10 entries
  const top10Entries = leaderboardEntries.slice(0, 10);

  // Check if current player is outside top 10
  const currentPlayerOutsideTop10 =
    currentPlayerRank > 10 && currentPlayerRank <= leaderboardEntries.length;
  const currentPlayerEntry = currentPlayerOutsideTop10
    ? leaderboardEntries[currentPlayerRank - 1]
    : null;

  // Get adjusted color for a player based on their skin (lighter + more saturated for readability)
  const getPlayerColor = (username: string): string => {
    const skinId = playerSkins.get(username) || "astro";
    const skin = getSkinById(skinId);
    return adjustColorForLeaderboard(skin.color);
  };

  return (
    <div className="leaderboard">
      <table>
        <tr>
          <th className="leaderboard-title" colSpan={2}>
            Leaderboard
          </th>
        </tr>
        {top10Entries.map((entry: [string, number], index: number) => {
          const username: string = entry[0];
          const score: number = entry[1];
          const rank: number = index + 1;
          const isCurrentPlayer = username === currentUsername;
          const playerColor = getPlayerColor(username);
          return (
            <tr key={username}>
              <td
                className="username-entry"
                style={{
                  color: playerColor,
                  fontWeight: isCurrentPlayer ? "bold" : "normal",
                }}
              >
                {rank}. {username}
              </td>
              <td
                className="score-entry"
                style={{
                  color: playerColor,
                  fontWeight: isCurrentPlayer ? "bold" : "normal",
                }}
              >
                {score}
              </td>
            </tr>
          );
        })}
        {currentPlayerEntry && (
          <tr>
            <td
              className="username-entry"
              style={{
                color: getPlayerColor(currentPlayerEntry[0]),
                fontWeight: "bold",
              }}
            >
              {currentPlayerRank}. {currentPlayerEntry[0]}
            </td>
            <td
              className="score-entry"
              style={{
                color: getPlayerColor(currentPlayerEntry[0]),
                fontWeight: "bold",
              }}
            >
              {currentPlayerEntry[1]}
            </td>
          </tr>
        )}
      </table>
    </div>
  );
}

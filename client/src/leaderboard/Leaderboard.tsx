import React from "react";
import { leaderboardEntry } from "../message/message";
import "./Leaderboard.css";

/**
 * Displays the current lobby's leaderboard, in the top right.
 * Shows top 10 players with rank numbers. If the current player
 * is not in top 10, they appear as an 11th entry with their actual rank.
 * @param leaderboard a map of each user in the lobby to their score
 * @returns a HTML element rendering the leaderboard
 */
export default function Leaderboard({
  leaderboard,
}: {
  leaderboard: Map<string, number>;
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
          return (
            <tr key={username} className={isCurrentPlayer ? "current-player" : ""}>
              <td className={`username-entry ${isCurrentPlayer ? "current-player" : ""}`}>
                {rank}. {username}
              </td>
              <td className={`score-entry ${isCurrentPlayer ? "current-player" : ""}`}>
                {score}
              </td>
            </tr>
          );
        })}
        {currentPlayerEntry && (
          <tr className="current-player">
            <td className="username-entry current-player">
              {currentPlayerRank}. {currentPlayerEntry[0]}
            </td>
            <td className="score-entry current-player">
              {currentPlayerEntry[1]}
            </td>
          </tr>
        )}
      </table>
    </div>
  );
}

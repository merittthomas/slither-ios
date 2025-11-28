package com.slitherios.leaderboard;

/**
 * LeaderboardEntry record to store username/score/skinId on the Leaderboard
 */
public record LeaderboardEntry(String username, Integer score, String skinId) {}

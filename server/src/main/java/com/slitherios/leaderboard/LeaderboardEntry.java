package com.slitherios.leaderboard;

/**
 * LeaderboardEntry record to store username/score pairs on the Leaderboard
 */
public record LeaderboardEntry(String username, Integer score) {}

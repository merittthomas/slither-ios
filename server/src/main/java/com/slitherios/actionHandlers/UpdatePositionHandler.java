package com.slitherios.actionHandlers;

import com.slitherios.exceptions.MissingFieldException;
import com.slitherios.gameState.GameState;
import com.slitherios.leaderboard.Leaderboard;
import com.slitherios.message.Message;
import com.slitherios.message.MessageType;
import com.slitherios.position.Position;
import com.slitherios.server.SlitherServer;
import com.slitherios.user.User;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.locks.ReentrantLock;
import org.java_websocket.WebSocket;

/**
 * UpdatePositionHandler class to allow for snake movement support
 */
public class UpdatePositionHandler {

  // Track accumulated boost cost per user (updates come every 50ms = 20 per second)
  // At 10 points per second, that's 0.5 points per update
  private static final Map<User, Double> userBoostCostAccumulator = new ConcurrentHashMap<>();
  // Track accumulated segments to remove (1 segment per 2 points = 5 segments per second at 10 pts/sec)
  private static final Map<User, Double> userSegmentAccumulator = new ConcurrentHashMap<>();
  private static final double BOOST_COST_PER_UPDATE = 0.5; // 10 points per second / 20 updates per second
  private static final int MIN_BOOST_SCORE = 10; // Minimum score required to start boosting
  private static final int SPAWN_LENGTH = 10; // Minimum snake length (spawn length)
  private static final int POINTS_PER_SEGMENT = 2; // Points per body segment (1 segment per 2 points)

  /**
   * Activated when SlitherServer receives UPDATE_POSITION method to
   * update for all users (sharing the inputted gameState) where the
   * newly moved snake connected to the inputted webSocket is located
   *
   * @param thisUser : the user whose snake's position is being updated
   * @param message : the deserialized message from the client containing
   * information about the snake's new position (to be added) and old
   * position (to be removed)
   * @param gameState : the GameState corresponding to the game in which
   * this UPDATE_POSITION message is being processed
   * @param webSocket : the WebSocket corresponding to the user whose snake's
   * position is being updated
   * @param gameStateSockets : the set of WebSockets for this game so other
   * users can be updated with this user's snake position update
   * @param server : the server through which GameState updates are sent live
   * to all users for synchronicity
   * @throws MissingFieldException if both addData and removeData messages do not each contain an 'x' and 'y' field
   */
  public void handlePositionUpdate(User thisUser, Message message, GameState gameState, WebSocket webSocket, Set<WebSocket> gameStateSockets, SlitherServer server) throws MissingFieldException {
    if (!(message.data().containsKey("add") && message.data().containsKey("remove")))
      throw new MissingFieldException(message, MessageType.ERROR);
    Map<String, Double> addData = (Map<String, Double>) message.data().get("add");
    Map<String, Double> removeData = (Map<String, Double>) message.data().get("remove");
    if ((!(addData.containsKey("x") && addData.containsKey("y"))) || (!(removeData.containsKey("x") && removeData.containsKey("y"))))
      throw new MissingFieldException(message, MessageType.ERROR);
    Position toAdd = new Position(addData.get("x"), addData.get("y"));
    Position toRemove = new Position(removeData.get("x"), removeData.get("y"));

    // Check if player is boosting
    boolean isBoosting = false;
    if (message.data().containsKey("boosting")) {
      Object boostingValue = message.data().get("boosting");
      isBoosting = boostingValue instanceof Boolean && (Boolean) boostingValue;
    }

    // Acquire per-user lock to prevent race conditions with concurrent position updates
    ReentrantLock userLock = gameState.getUserLock(thisUser);
    userLock.lock();
    try {
      // IMPORTANT: Process position update FIRST, before removing segments for boost
      // Server-authoritative: updateOwnPositions returns the actual tail that was removed
      Position actualRemoved = gameState.updateOwnPositions(thisUser, toAdd, toRemove);
      if (actualRemoved == null) {
        return; // Snake doesn't exist, skip processing
      }
      // Use actualRemoved (server's truth) when broadcasting to other players
      gameState.updateOtherUsersWithPosition(thisUser, toAdd, actualRemoved, webSocket, gameStateSockets, server, isBoosting);
      gameState.collisionCheck(thisUser, toAdd, webSocket, gameStateSockets, server);

      // Now handle boost score deduction and segment removal AFTER position update
      if (isBoosting) {
        // Get current score to check if boost is allowed
        Leaderboard leaderboard = server.getLeaderboard(gameState.getGameCode());
        int currentScore = leaderboard != null ? leaderboard.getCurrentScore(thisUser) : 0;

        // Process boost cost if player has score > 0 (client already checks >= MIN_BOOST_SCORE to initiate)
        if (currentScore > 0) {
          // Accumulate boost cost
          double currentAccumulated = userBoostCostAccumulator.getOrDefault(thisUser, 0.0);
          currentAccumulated += BOOST_COST_PER_UPDATE;

          // When accumulated cost reaches 1 or more, deduct from score
          if (currentAccumulated >= 1.0) {
            int pointsToDeduct = (int) currentAccumulated;
            // Deduct points (can go down to 0)
            int actualDeduction = Math.min(pointsToDeduct, currentScore);
            if (actualDeduction > 0) {
              server.handleUpdateScore(thisUser, gameState, -actualDeduction);
              currentAccumulated -= actualDeduction;

              // Accumulate segments to remove (1 segment per 10 points)
              double segmentAccum = userSegmentAccumulator.getOrDefault(thisUser, 0.0);
              segmentAccum += (double) actualDeduction / POINTS_PER_SEGMENT;

              // When we've accumulated enough for a full segment, remove it
              if (segmentAccum >= 1.0) {
                int segmentsToRemove = (int) segmentAccum;
                gameState.decreaseSnakeLength(thisUser, segmentsToRemove, webSocket, gameStateSockets, server, SPAWN_LENGTH);
                segmentAccum -= segmentsToRemove;
              }
              userSegmentAccumulator.put(thisUser, segmentAccum);
            }
          }

          userBoostCostAccumulator.put(thisUser, currentAccumulated);
        }
      }
    } finally {
      userLock.unlock();
    }
  }

  /**
   * Clears the boost cost and segment accumulators for a user (call when user dies or disconnects)
   * @param user : the user to clear
   */
  public static void clearUserBoostAccumulator(User user) {
    userBoostCostAccumulator.remove(user);
    userSegmentAccumulator.remove(user);
  }

}


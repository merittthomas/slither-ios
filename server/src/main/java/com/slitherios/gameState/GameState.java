package com.slitherios.gameState;

import com.slitherios.actionHandlers.UpdatePositionHandler;
import com.slitherios.exceptions.InvalidRemoveCoordinateException;
import com.slitherios.leaderboard.Leaderboard;
import com.slitherios.message.Message;
import com.slitherios.message.MessageType;
import com.slitherios.orb.OrbColor;
import com.slitherios.position.Position;
import com.slitherios.orb.Orb;
import com.slitherios.orb.OrbGenerator;
import com.slitherios.orb.OrbSize;
import com.slitherios.server.SlitherServer;
import com.slitherios.snake.SnakeScaling;
import com.slitherios.user.User;

import java.util.ArrayList;
import java.util.Deque;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ScheduledThreadPoolExecutor;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.locks.ReentrantLock;
import org.java_websocket.WebSocket;

/**
 * GameState class to contain all game data corresponding to this state
 */
public class GameState {

  private final SlitherServer slitherServer; // an instance of the SlitherServer (currently running server)
  private final String gameCode; // the game code corresponding to this GameState
  private final Set<Orb> orbs; // the set of all the orbs currently present in the game
  private int numDeathOrbs; // total count of the number of orbs formed as a result of players dying
  private final OrbGenerator orbGenerator = new OrbGenerator(); //  an OrbGenerator for this game
  private final int ORB_GENERATION_TIME_INTERVAL = 5; // time interval at which new orbs are generated
  private final Map<User, Set<Position>> userToOthersPositions; // maps each user to the positions of every other snake's body parts
  private final Map<User, Set<Position>> userToOwnPositions; // maps each user to their own snake's body parts
  private final Map<User, Deque<Position>> userToSnakeDeque; // maps each user to a double ended queue with their body parts (in order)
  private final Map<Position, User> positionToUser; // maps each position to the user who owns it (for collision radius calculation)
  private final int BASE_SNAKE_RADIUS = 35; // base radius of each body part of the snakes (used for orb collision)
  private final Map<User, Double> userOrbSegmentAccumulator = new ConcurrentHashMap<>(); // tracks accumulated points toward next body segment
  // Points per segment now calculated dynamically via SnakeScaling.calculatePointsPerSegment()
  private final Map<User, ReentrantLock> userLocks = new ConcurrentHashMap<>(); // per-user locks for thread safety

  /**
   * GameState constructor to initialize all necessary variables, including
   * a corresponding server and game code unique to this state
   * 
   * Note: Uses a ScheduledThreadPoolExecutor to generate orbs up to the
   * maximum orb count every 5 seconds
   * 
   * @param slitherServer : the server to be used in correlation with this
   * GameState to synchronize all assigned users
   * @param gameCode : the unique game code to be assigned to this state
   */
  public GameState(SlitherServer slitherServer, String gameCode) {
    this.slitherServer = slitherServer;
    this.gameCode = gameCode;
    this.orbs = new HashSet<>();
    this.userToOthersPositions = new HashMap<>();
    this.userToOwnPositions = new HashMap<>();
    this.userToSnakeDeque = new HashMap<>();
    this.positionToUser = new ConcurrentHashMap<>();
    ScheduledThreadPoolExecutor exec = new ScheduledThreadPoolExecutor(1);
    exec.scheduleAtFixedRate(new Runnable() {
      public void run() {
        // Reduced logging for performance - uncomment for debugging
        // System.out.println("Try to generate orbs");
        GameState.this.generateOrb();
        GameState.this.sendOrbData();
      }
    }, 0, this.ORB_GENERATION_TIME_INTERVAL, TimeUnit.SECONDS);
  }

  /**
   * Adds a user to this game state
   * @param user : the user to be added to this GameState
   */
  public void addUser(User user) {
    this.userToOwnPositions.put(user, new HashSet<>());
    this.userToOthersPositions.put(user, new HashSet<>());
    this.userToSnakeDeque.put(user, new LinkedList<>());
    this.userLocks.put(user, new ReentrantLock());
  }

  /**
   * Gets the lock for a specific user for thread-safe position updates
   * @param user : the user whose lock to retrieve
   * @return the ReentrantLock for the user
   */
  public ReentrantLock getUserLock(User user) {
    return this.userLocks.computeIfAbsent(user, k -> new ReentrantLock());
  }

  /**
   * Fills this GameState's set of orbs up to the maximum orb count (plus death orbs)
   */
  public void generateOrb() {
    this.orbGenerator.generateOrbs(this.orbs, this.numDeathOrbs);
  }

  /**
   * Removes an orb within this GameState's set of orbs if that orb has
   * a position matching that of the input
   * @param position : the position of the orb to be removed
   * @return a boolean indicating whether an orb with a matching position was
   * found (and therefore removed)
   */
  public boolean removeOrb(Position position) {
    Orb removeOrb = new Orb(position, OrbSize.SMALL, "red"); // OrbSize/color irrelevant for hash equality comparison
    if (!this.orbs.contains(removeOrb))
      return false;
    while (this.orbs.contains(removeOrb)) {
      this.orbs.remove(removeOrb);
    }
    return true;
  }

  /**
   * Sends the updated orb data (including newly-generated orbs) to all clients
   * connected to this GameState
   */
  public void sendOrbData() {
    Map<String, Object> orbData = new HashMap<>();
    orbData.put("orbSet", this.orbs);
    String json = this.slitherServer.serialize(new Message(MessageType.SEND_ORBS, orbData));    
    this.slitherServer.sendToAllGameStateConnections(this, json);
  }

  /**
   * Updates the specified user's position based on its current position.
   * Server-authoritative: uses server's actual tail position, not client's expected.
   * @param thisUser : the user whose position is to change
   * @param toAdd : the position to add to the front of this user's snake
   * @param toRemove : the position the client expects to remove (used for logging only)
   * @return the actual tail position that was removed, or null if snake doesn't exist
   */
  public Position updateOwnPositions(User thisUser, Position toAdd, Position toRemove) {
    if (!this.userToOwnPositions.containsKey((thisUser)))
      this.userToOwnPositions.put(thisUser, new HashSet<>());

    Deque<Position> snakeDeque = this.userToSnakeDeque.get(thisUser);
    if (snakeDeque == null || snakeDeque.isEmpty()) {
      return null; // Snake doesn't exist yet
    }

    // Add the new head position
    this.userToOwnPositions.get(thisUser).add(toAdd);
    snakeDeque.addFirst(toAdd);
    this.positionToUser.put(toAdd, thisUser); // Track position ownership

    // Server-authoritative: remove from server's actual tail position, not client's expected
    // This handles cases where boost has removed segments the client doesn't know about yet
    Position actualTail = snakeDeque.peekLast();
    if (actualTail != null) {
      snakeDeque.removeLast();
      this.userToOwnPositions.get(thisUser).remove(actualTail);
      this.positionToUser.remove(actualTail); // Clean up position ownership
    }
    return actualTail;
  }

  /**
   * Sends a message to the corresponding client (via webSocket) that this
   * user's snake length has been increased
   * @param webSocket : the webSocket through which to send the increased length message
   * @param newBodyParts : the list of Positions that correspond to the increase in length
   * @param server : the server through which to serialize the message to be sent via webSocket
   */
  private void sendOwnIncreasedLengthBodyParts(WebSocket webSocket, List<Position> newBodyParts, SlitherServer server) {
    Map<String, Object> data = new HashMap<>();
    data.put("newBodyParts", newBodyParts);
    Message message = new Message(MessageType.INCREASE_OWN_LENGTH, data);
    webSocket.send(server.serialize(message));
  }

  /**
   * Sends a message to all other corresponding clients (to this GameState) (via webSocket) that this
   * user's snake length has been increased
   * @param webSocket : the webSocket through which to send the increased length message
   * @param newBodyParts : the list of Positions that correspond to the increase in length
   * @param gameStateSockets : the list of other clients' sockets to receieve the update in this client's snake length
   * @param server : the server through which to serialize the message to be sent via webSocket
   */
  private void sendOthersIncreasedLengthBodyParts(WebSocket webSocket, List<Position> newBodyParts, Set<WebSocket> gameStateSockets, SlitherServer server, String skinId) {
    Map<String, Object> data = new HashMap<>();
    data.put("newBodyParts", newBodyParts);
    data.put("skinId", skinId);
    Message message = new Message(MessageType.INCREASE_OTHER_LENGTH, data);
    String jsonMessage = server.serialize(message);
    for (WebSocket socket : gameStateSockets) {
      if (socket.equals(webSocket))
        continue;
      socket.send(jsonMessage);
    }
  }

  /**
   * Sends a message to the corresponding client (via webSocket) that this
   * user's snake length has been decreased
   * @param webSocket : the webSocket through which to send the decreased length message
   * @param count : the number of body parts to remove from the tail
   * @param server : the server through which to serialize the message to be sent via webSocket
   */
  private void sendOwnDecreasedLength(WebSocket webSocket, int count, SlitherServer server) {
    Map<String, Object> data = new HashMap<>();
    data.put("count", count);
    Message message = new Message(MessageType.DECREASE_OWN_LENGTH, data);
    webSocket.send(server.serialize(message));
  }

  /**
   * Sends a message to all other corresponding clients (to this GameState) (via webSocket) that this
   * user's snake length has been decreased
   * @param webSocket : the webSocket through which to send the decreased length message
   * @param removedPositions : the list of Positions that were removed from the tail
   * @param gameStateSockets : the list of other clients' sockets to receive the update in this client's snake length
   * @param server : the server through which to serialize the message to be sent via webSocket
   * @param skinId : the skin ID of the snake being decreased
   */
  private void sendOthersDecreasedLength(WebSocket webSocket, List<Position> removedPositions, Set<WebSocket> gameStateSockets, SlitherServer server, String skinId) {
    Map<String, Object> data = new HashMap<>();
    data.put("removedPositions", removedPositions);
    data.put("skinId", skinId);
    Message message = new Message(MessageType.DECREASE_OTHER_LENGTH, data);
    String jsonMessage = server.serialize(message);
    for (WebSocket socket : gameStateSockets) {
      if (socket.equals(webSocket))
        continue;
      socket.send(jsonMessage);
    }
  }

  /**
   * Decreases a user's snake length by removing segments from the tail
   * @param thisUser : the user whose snake is being shortened
   * @param count : the number of segments to remove
   * @param webSocket : the current user's socket
   * @param gameStateSockets : all sockets in this game
   * @param server : the server instance
   * @param minLength : minimum length the snake can be (spawn length)
   * @return the number of segments actually removed
   */
  public int decreaseSnakeLength(User thisUser, int count, WebSocket webSocket, Set<WebSocket> gameStateSockets, SlitherServer server, int minLength) {
    Deque<Position> snakeDeque = this.userToSnakeDeque.get(thisUser);
    if (snakeDeque == null) return 0;

    int currentLength = snakeDeque.size();
    int canRemove = Math.min(count, currentLength - minLength);
    if (canRemove <= 0) return 0;

    List<Position> removedPositions = new ArrayList<>();
    for (int i = 0; i < canRemove; i++) {
      Position removed = snakeDeque.pollLast();
      if (removed != null) {
        removedPositions.add(removed);
        this.userToOwnPositions.get(thisUser).remove(removed);
        this.positionToUser.remove(removed); // Clean up position ownership
        // Remove from other users' tracking
        for (User user : this.userToOthersPositions.keySet()) {
          if (!user.equals(thisUser)) {
            this.userToOthersPositions.get(user).remove(removed);
          }
        }
      }
    }

    if (removedPositions.size() > 0) {
      this.sendOwnDecreasedLength(webSocket, removedPositions.size(), server);
      this.sendOthersDecreasedLength(webSocket, removedPositions, gameStateSockets, server, thisUser.getSkinId());
    }

    return removedPositions.size();
  }

  /**
   * Gets the current length of a user's snake
   * @param user : the user whose snake length to get
   * @return the length of the snake, or 0 if user not found
   */
  public int getSnakeLength(User user) {
    Deque<Position> deque = this.userToSnakeDeque.get(user);
    return deque != null ? deque.size() : 0;
  }

  /**
   * Creates a new snake for this user at a preset position and sends this data to all other users sharing this GameState
   * @param thisUser : the user for which this new snake is being generated
   * @param webSocket : the current user's socket through which to send data to the client
   * @param gameStateSockets : the list of other clients' sockets to receive the creation update of this client's snake
   * @param server : the server through which to serialize the message to be sent via webSocket
   */
  public void createNewSnake(User thisUser, WebSocket webSocket, Set<WebSocket> gameStateSockets, SlitherServer server) {
    createNewSnakeWithScore(thisUser, webSocket, gameStateSockets, server, 0);
  }

  /**
   * Creates a new snake for this user with a specific initial score and sends this data to all other users sharing this GameState.
   * The snake length is calculated based on the initial score using the diminishing returns formula.
   * @param thisUser : the user for which this new snake is being generated
   * @param webSocket : the current user's socket through which to send data to the client
   * @param gameStateSockets : the list of other clients' sockets to receive the creation update of this client's snake
   * @param server : the server through which to serialize the message to be sent via webSocket
   * @param initialScore : the initial score to start with (0 for normal game)
   */
  public void createNewSnakeWithScore(User thisUser, WebSocket webSocket, Set<WebSocket> gameStateSockets, SlitherServer server, int initialScore) {
    // Calculate the snake length based on initialScore using diminishing returns formula
    int snakeLength = calculateSnakeLengthFromScore(initialScore);

    // Get the spacing between segments based on visual scale
    // Larger snakes need more spacing between segments to look proportional
    double scale = SnakeScaling.calculateSnakeScale(initialScore);
    double segmentSpacing = 5 * scale; // Base spacing is 5, scaled up for larger snakes

    // The client always starts with 10 segments (base spawn length)
    // We need to send the additional segments beyond 10 to the client itself
    int baseLength = 10;
    List<Position> newSnake = new ArrayList<>();
    List<Position> additionalSegmentsForOwn = new ArrayList<>();

    // Position of the 10th segment (where extra segments will stack)
    double stackPosition = 100 + segmentSpacing * (baseLength - 1);

    for (int i = 0; i < snakeLength; i++) {
      Position position;
      if (i < baseLength) {
        // First 10 segments are spaced normally
        position = new Position(600, 100 + segmentSpacing * i);
      } else {
        // Extra segments all stack at the 10th segment's position
        // They will spread out as the snake moves
        position = new Position(600, stackPosition);
      }
      newSnake.add(position);
      this.userToSnakeDeque.get(thisUser).addLast(position);
      this.positionToUser.put(position, thisUser); // Track position ownership

      // Segments beyond the base 10 need to be sent to the client
      if (i >= baseLength) {
        additionalSegmentsForOwn.add(position);
      }
    }

    // Send all segments to other clients
    this.sendOthersIncreasedLengthBodyParts(webSocket, newSnake, gameStateSockets, server, thisUser.getSkinId());

    // Send additional segments (beyond base 10) to the client itself
    if (additionalSegmentsForOwn.size() > 0) {
      this.sendOwnIncreasedLengthBodyParts(webSocket, additionalSegmentsForOwn, server);
    }
  }

  /**
   * Calculate the snake length from a score based on the diminishing returns formula.
   * Base length is 10 segments (at score 0).
   * Additional segments are calculated by integrating the points-per-segment curve.
   * @param score : the score to calculate length from
   * @return the number of body segments
   */
  private int calculateSnakeLengthFromScore(int score) {
    if (score <= 0) {
      return 10; // Base snake length
    }

    // Simulate accumulating score to calculate body length
    // This mirrors the logic in UpdatePositionHandler for consistency
    int segments = 10; // Start with base length
    double accumulated = 0;

    for (int s = 0; s < score; s++) {
      double pointsPerSegment = SnakeScaling.calculatePointsPerSegment(s);
      accumulated += 1.0;
      while (accumulated >= pointsPerSegment) {
        accumulated -= pointsPerSegment;
        segments++;
        // Update pointsPerSegment for new score
        pointsPerSegment = SnakeScaling.calculatePointsPerSegment(s);
      }
    }

    return segments;
  }

  /**
   * Updates the specified user's position based on its current position
   * @param thisUser : the user whose position is to change
   * @param toAdd : the position to add to the front of this user's snake
   * @param toRemove : the position to remove from the back of this user's snake
   * @param webSocket :
   * @param gameStateSockets :
   * @param server :
   * @param isBoosting : whether the user is currently boosting
   */
  public void updateOtherUsersWithPosition(User thisUser, Position toAdd, Position toRemove, WebSocket webSocket, Set<WebSocket> gameStateSockets, SlitherServer server, boolean isBoosting) {
    for (User user : this.userToOthersPositions.keySet()) {
      if (user.equals(thisUser))
        continue;
      this.userToOthersPositions.get(user).add(toAdd);
      this.userToOthersPositions.get(user).remove(toRemove);
    }

    Map<String, Object> data = new HashMap<>();
    data.put("add", toAdd);
    data.put("remove", toRemove);
    data.put("skinId", thisUser.getSkinId());
    data.put("username", thisUser.getUsername());
    data.put("boosting", isBoosting);
    Message message = new Message(MessageType.UPDATE_POSITION, data);
    String jsonResponse = server.serialize(message);

    for (WebSocket socket : gameStateSockets) {
      if (socket.equals(webSocket))
        continue;
      socket.send(jsonResponse);
    }
  }

  /**
   * This function is called when a user's snake dies. It updates all the other clients in the
   * same game with the information on the latest positions at which the user's snake's body parts
   * were, and instructs the client to remove those body parts so that they are no longer rendered.
   *
   * @param thisUser - a User: the User whose snake body parts need to be removed from all other
   *                 clients in the same game
   * @param webSocket - a WebSocket: The WebSocket connections corresponding to thisUser
   * @param gameStateSockets - a Set of WebSockets: The set of all the websockets corresponding to
   *                         this GameState (i.e. the websockets of all the clients in the same
   *                         game).
   * @param server - a SlitherServer: an instance of the currently running server.
   */
  public void updateOtherUsersWithRemovedPositions(User thisUser, WebSocket webSocket, Set<WebSocket> gameStateSockets, SlitherServer server) {
    List<Position> removedPositions = new ArrayList<>();
    removedPositions.addAll(this.userToOwnPositions.get(thisUser));
    for (Position position : removedPositions) {
      for (User user : this.userToOthersPositions.keySet()) {
        if (user.equals(thisUser))
          continue;
        this.userToOthersPositions.get(user).remove(position);
      }
    }
    Map<String, Object> data = new HashMap<>();
    data.put("removePositions", removedPositions);
    String jsonMessage = server.serialize(new Message(MessageType.OTHER_USER_DIED, data));
    for (WebSocket socket : gameStateSockets) {
      if (socket.equals(webSocket))
        continue;
      socket.send(jsonMessage);
    }
  }

  /**
   * Computes and returns the Euclidean distance between two Positions (two coordinates on the
   * game map).
   *
   * @param firstCenter - a Position: the first position (coordinate) on the game map.
   * @param secondCenter - a Position: the second position (coordinate) on the game map.
   * @return a double: the Euclidean distance between firstCenter and secondCenter.
   */
  private double distance(Position firstCenter, Position secondCenter) {
    return Math.sqrt(Math.pow(firstCenter.x() - secondCenter.x(), 2) + Math.pow(firstCenter.y() - secondCenter.y(), 2));
  }

  /**
   * Takes a double-ended queue containing the positions of the body parts of some snake and returns
   * a List of positions containing the last two body parts of the snake (without modifying the
   * original double-ended queue).
   * @param bodyParts
   * @return
   */
  private List<Position> getLastTwoBodyParts(Deque<Position> bodyParts) {
    Position lastPosition = bodyParts.removeLast();
    Position secondLastPosition = bodyParts.peekLast();
    bodyParts.addLast(lastPosition);
    List<Position> lastTwoBodyParts = new ArrayList<>();
    lastTwoBodyParts.add(secondLastPosition);
    lastTwoBodyParts.add(lastPosition);
    return lastTwoBodyParts;
  }

  /**
   * Computes the coordinates (the Position) at which a new body part should be created for a user
   * (when they eat an orb). New segments stack at the current tail position - they only become
   * visible as the snake moves and the tail extends. This prevents segments from shooting outward
   * when eating large orbs.
   *
   * @param thisUser - a User: the user whose snake's new body part position needs to be computed.
   * @return a Position: the position at which the new body part for the user's snake will be
   * created (same as current tail position).
   */
  private Position getNewBodyPartPosition(User thisUser) {
    Deque<Position> userBodyParts = this.userToSnakeDeque.get(thisUser);
    Position newPosition;
    if (userBodyParts.size() == 0)
      newPosition = new Position(600.0, 100.0);
    else {
      // Stack new segments at the current tail position
      // They will only become visible as the snake moves and the tail naturally extends
      Position tailPosition = userBodyParts.peekLast();
      newPosition = new Position(
        Math.round(tailPosition.x() * 100) / 100.0,
        Math.round(tailPosition.y() * 100) / 100.0
      );
    }
    return newPosition;
  }

  /**
   * Generates death orbs for a snake when it dies: a DEATH orb (10 pts, twice the size of LARGE)
   * is created for visually distinct body segments (not stacked/pending segments), and all the
   * clients in the same game are updated with the new orbs so that they can be rendered.
   *
   * @param positions - a List of Positions: the positions of the body parts of the snake that has
   *                  died and needs to be converted ("dissolved") into death orbs.
   * @param skinId - the skin ID of the dead snake, used to color the orbs
   */
  private void generateDeathOrbs(List<Position> positions, String skinId) {
    String orbColor = OrbColor.getColorForSkin(skinId);
    // Minimum distance between orbs - segments closer than this are stacked/pending
    // and should only produce one orb at that location
    double minOrbDistance = 3.0;
    Position lastOrbPosition = null;

    for (int i = 0; i < positions.size(); i++) {
      Position pos = positions.get(i);
      boolean shouldCreateOrb = true;

      if (lastOrbPosition != null) {
        double dist = this.distance(pos, lastOrbPosition);
        if (dist < minOrbDistance) {
          // Position is too close to last orb - skip it (it's a stacked/pending segment)
          shouldCreateOrb = false;
        }
      }

      if (shouldCreateOrb) {
        this.orbs.add(new Orb(pos, OrbSize.LARGE, orbColor));
        this.numDeathOrbs++;
        lastOrbPosition = pos;
      }
    }
    this.sendOrbData();
  }

  /**
   * Runs a collision check when the position of a snake is updated to see if the snake has eaten an
   * orb, collided with another snake, or collided with the game boundary. If any of these have
   * occurred then the relevant computations, state updates, and client updates are performed.
   *
   * @param thisUser - a User: the user for whom we are conducting the collision check (the position
   *                 of the snake of this user has just been updated).
   * @param latestHeadPosition - a Position: the position (coordinate) to which the head of the
   *                           user's snake has just moved.
   * @param webSocket - a WebSocket: the WebSocket connection object associated with this user
   * @param gameStateSockets - a Set of WebSockets: the set of all the WebSockets for players
   *                         within the same game as this user.
   * @param server - a SlitherServer object: an instance of the server that is currently running.
   */
  public void collisionCheck(User thisUser, Position latestHeadPosition, WebSocket webSocket, Set<WebSocket> gameStateSockets, SlitherServer server) {
    // Reduced logging for performance - uncomment for debugging
    // System.out.println("Run collision check");
    Set<Position> otherBodies = this.userToOthersPositions.get(thisUser);
    Set<Orb> allOrbs = new HashSet<>(this.orbs);

    // Get this user's score for dynamic collision radius
    Leaderboard leaderboard = server.getLeaderboard(this.gameCode);
    int thisUserScore = 0;
    if (leaderboard != null) {
      Integer score = leaderboard.getCurrentScore(thisUser);
      if (score != null) {
        thisUserScore = score;
      }
    }
    double thisUserCollisionRadius = SnakeScaling.calculateCollisionRadius(thisUserScore);

    // check if the user's snake has collided with (gone beyond) the game map boundary -- kill
    // the snake if this happens (using dynamic radius based on score)
    if( latestHeadPosition.x() - thisUserCollisionRadius <= -1500 ||
        latestHeadPosition.x() + thisUserCollisionRadius >= 1500 ||
        latestHeadPosition.y() - thisUserCollisionRadius <= -1500 ||
        latestHeadPosition.y() + thisUserCollisionRadius >= 1500
      ) {
      Message userDiedMessage = new Message(MessageType.YOU_DIED, new HashMap<>());
      String jsonMessage = server.serialize(userDiedMessage);
      webSocket.send(jsonMessage);
      this.updateOtherUsersWithRemovedPositions(thisUser, webSocket, gameStateSockets, server);

      List<Position> deadSnakePositions = new ArrayList<>();
      deadSnakePositions.addAll(this.userToSnakeDeque.get(thisUser));
      String deadSkinId = thisUser.getSkinId();
      this.userToOwnPositions.remove(thisUser);
      this.userToOthersPositions.remove(thisUser);
      this.userToSnakeDeque.remove(thisUser);
      server.handleUserDied(thisUser, webSocket, this);
      this.clearUserOrbAccumulator(thisUser);
      UpdatePositionHandler.clearUserBoostAccumulator(thisUser);
      this.generateDeathOrbs(deadSnakePositions, deadSkinId);
      return;
    }

    // check if the user's snake has collided with any other snakes in the same game -- kill the
    // user's snake if this happens (using dynamic radii based on both snakes' scores)
    for (Position otherBodyPosition : otherBodies) {
      // Get the owner of this body position to calculate their collision radius
      User otherUser = this.positionToUser.get(otherBodyPosition);
      double otherUserCollisionRadius = SnakeScaling.calculateCollisionRadius(0); // default to base radius
      if (otherUser != null && leaderboard != null) {
        Integer otherScore = leaderboard.getCurrentScore(otherUser);
        if (otherScore != null) {
          otherUserCollisionRadius = SnakeScaling.calculateCollisionRadius(otherScore);
        }
      }
      // Collision occurs when distance is less than sum of radii (two circles touching)
      double collisionThreshold = thisUserCollisionRadius + otherUserCollisionRadius;
      if (this.distance(latestHeadPosition, otherBodyPosition) <= collisionThreshold) {
        Message userDiedMessage = new Message(MessageType.YOU_DIED, new HashMap<>());
        String jsonMessage = server.serialize(userDiedMessage);
        webSocket.send(jsonMessage);

        List<Position> deadSnakePositions = new ArrayList<>();
        deadSnakePositions.addAll(this.userToSnakeDeque.get(thisUser));
        String deadSkinId = thisUser.getSkinId();
        this.updateOtherUsersWithRemovedPositions(thisUser, webSocket, gameStateSockets, server);
        this.userToOwnPositions.remove(thisUser);
        this.userToOthersPositions.remove(thisUser);
        this.userToSnakeDeque.remove(thisUser);
        server.handleUserDied(thisUser, webSocket, this);
        this.clearUserOrbAccumulator(thisUser);
        UpdatePositionHandler.clearUserBoostAccumulator(thisUser);
        this.generateDeathOrbs(deadSnakePositions, deadSkinId);
        return;
      }
    }

    // Check if the user's snake has eaten any orbs -- remove the eaten orbs and increase the length
    // of the snake when this happens (using dynamic radius based on score)
    List<Position> newBodyParts = new ArrayList<>();
    boolean orbCollided = false;
    for (Orb orb : allOrbs) {
      Position orbPosition = orb.getPosition();
      if (this.distance(latestHeadPosition, orbPosition) <= thisUserCollisionRadius) {
        this.removeOrb(orbPosition);
        orbCollided = true;
        Integer orbValue = switch(orb.getSize()) {
          case SMALL -> 1;
          case MEDIUM -> 5;
          case LARGE -> 10;
        };
        server.handleUpdateScore(thisUser, this, orbValue);

        // Accumulate points toward segments using dynamic points-per-segment based on score
        // Larger snakes need more points per segment (diminishing returns)
        double pointsPerSegment = SnakeScaling.calculatePointsPerSegment(thisUserScore);
        double segmentAccum = userOrbSegmentAccumulator.getOrDefault(thisUser, 0.0);
        segmentAccum += (double) orbValue / pointsPerSegment;

        // Add segments only when accumulator reaches 1.0+
        int segmentsToAdd = (int) segmentAccum;
        for (int i = 0; i < segmentsToAdd; i++) {
          Position newPosition = this.getNewBodyPartPosition(thisUser);
          newBodyParts.add(newPosition);
          // Also add to server's snake deque to keep server's length accurate
          this.userToSnakeDeque.get(thisUser).addLast(newPosition);
          this.userToOwnPositions.get(thisUser).add(newPosition);
          this.positionToUser.put(newPosition, thisUser); // Track position ownership
        }
        segmentAccum -= segmentsToAdd;
        userOrbSegmentAccumulator.put(thisUser, segmentAccum);
      }
    }
    if (orbCollided)
      this.sendOrbData();

    if (newBodyParts.size() > 0) {
      // increase the length of the user's own snake with their client
      this.sendOwnIncreasedLengthBodyParts(webSocket, newBodyParts, server);
      // increase the length of the user's snake for every other client in the same game
      this.sendOthersIncreasedLengthBodyParts(webSocket, newBodyParts, gameStateSockets, server, thisUser.getSkinId());
    }
  }

  /**
   * Provides this GameState's unique game code
   * @return this GameState's unique game code (type: String)
   */
  public String getGameCode() {
    return this.gameCode;
  }

  /**
   * Checks if a username is already taken in this game state
   * @param username : the username to check
   * @return true if the username is already taken (case-insensitive), false otherwise
   */
  public boolean isUsernameTaken(String username) {
    for (User user : this.userToSnakeDeque.keySet()) {
      if (user.getUsername().equalsIgnoreCase(username)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Clears the orb segment accumulator for a user (call when user dies or disconnects)
   * @param user : the user to clear
   */
  public void clearUserOrbAccumulator(User user) {
    userOrbSegmentAccumulator.remove(user);
  }
}

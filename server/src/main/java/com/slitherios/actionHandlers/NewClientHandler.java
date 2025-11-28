package com.slitherios.actionHandlers;

import com.slitherios.exceptions.ClientAlreadyExistsException;
import com.slitherios.exceptions.IncorrectGameCodeException;
import com.slitherios.exceptions.MissingFieldException;
import com.slitherios.exceptions.UsernameTakenException;
import com.slitherios.gameState.GameState;
import com.slitherios.message.Message;
import com.slitherios.message.MessageType;
import com.slitherios.server.SlitherServer;
import com.slitherios.user.User;
import org.java_websocket.WebSocket;

/**
 * NewClientHandler class to allow for new client game-creation and game-joining
 * support without and with game-codes upon entry respectively
 */
public class NewClientHandler {

  /**
   * Activated when SlitherServer receives NEW_CLIENT_WITH_CODE method to
   * add a new user to an existing game (using an existing game code)
   *
   * @param message  : the deserialized message from the client containing
   * information about the new user's username and the game code corresponding
   * to the game to which they should be added
   * @param websocket : the WebSocket corresponding to the user who is being
   * added to the existing game
   * @param server : the server through which the new user is assigned
   * a websocket and game code
   * @return the new User object being added to the existing game
   * @throws MissingFieldException if the deserialized message does not contain 'username' and 'gameCode' keyed fields
   * @throws ClientAlreadyExistsException if the socket already has a corresponding user
   * @throws IncorrectGameCodeException if the receieved game code does not exist
   * @throws UsernameTakenException if the username is already taken in the lobby
   */
  public User handleNewClientWithCode(Message message, WebSocket websocket, SlitherServer server) throws MissingFieldException, ClientAlreadyExistsException, IncorrectGameCodeException, UsernameTakenException {
    if (!message.data().containsKey("username") || !message.data().containsKey("gameCode"))
      throw new MissingFieldException(message, MessageType.JOIN_ERROR);
    String username = message.data().get("username").toString();
    String skinId = message.data().containsKey("skinId")
        ? message.data().get("skinId").toString()
        : "astro";  // Default fallback for backward compatibility
    String gameCode = message.data().get("gameCode").toString();
    if (!server.getExistingGameCodes().contains(gameCode))
      throw new IncorrectGameCodeException(MessageType.JOIN_ERROR);

    // Check if username is already taken in this lobby
    GameState targetGameState = server.getGameStateByCode(gameCode);
    if (targetGameState != null && targetGameState.isUsernameTaken(username)) {
      throw new UsernameTakenException(MessageType.USERNAME_TAKEN);
    }

    User user = new User(username, skinId);
    boolean result = server.addWebsocketUser(websocket, user);
    if (!result)
      throw new ClientAlreadyExistsException(MessageType.JOIN_ERROR);
    server.addGameCodeToUser(gameCode, user);
    return user;
  }

  /**
   * Activated when SlitherServer receives NEW_CLIENT_NO_CODE method to
   * perform game setup (i.e. create a new user, assign them a webSocket, etc.)
   * 
   * @param message : the deserialized message from the client containing
   * information about the new user's username
   * @param websocket : the WebSocket corresponding to the user who is being
   * added to the new game
   * @param server : the server through which the new user is assigned
   * a websocket
   * @return the new User object being added to a new game
   * @throws MissingFieldException if the deserialized message does not contain a 'username' keyed field
   * @throws ClientAlreadyExistsException if the socket already has a corresponding user
   */
  public User handleNewClientNoCode(Message message, WebSocket websocket, SlitherServer server) throws MissingFieldException, ClientAlreadyExistsException {
    if (!message.data().containsKey("username"))
      throw new MissingFieldException(message, MessageType.JOIN_ERROR);
    String skinId = message.data().containsKey("skinId")
        ? message.data().get("skinId").toString()
        : "astro";  // Default fallback for backward compatibility
    User user = new User(message.data().get("username").toString(), skinId);
    boolean result = server.addWebsocketUser(websocket, user);
    if (!result)
      throw new ClientAlreadyExistsException(MessageType.JOIN_ERROR);
    return user;
  }
}


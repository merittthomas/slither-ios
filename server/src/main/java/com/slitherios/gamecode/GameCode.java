package com.slitherios.gamecode;

import java.util.HashMap;
import java.util.Map;

import com.slitherios.gameState.GameState;
import com.slitherios.message.Message;
import com.slitherios.message.MessageType;
import com.slitherios.server.SlitherServer;

/**
 * GameCode class to allow for operations on synchronizing game codes between
 * users in identical games
 */
public class GameCode {
  /**
   * Method to send the corresponding game code to all other users with a matching GameState
   * @param gameCode : the game code to be sent to all users within the same game
   * @param gameState : the game state for which all users present within it will use a matching game code
   * @param slitherServer : the server through which to serialize and send the game code updating message to all users within the same game
   */
  public static void sendGameCode(String gameCode, GameState gameState, SlitherServer slitherServer) {
      Map<String, Object> map = new HashMap<String, Object>();
      map.put("gameCode", gameCode);
      Message message = new Message(MessageType.SET_GAME_CODE, map);
      String json = slitherServer.serialize(message);
      slitherServer.sendToAllGameStateConnections(gameState, json);
    }
}

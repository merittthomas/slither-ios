package edu.brown.cs32.exceptions;

import edu.brown.cs32.message.MessageType;

/**
 * Custom exception for when a user tries to join a lobby with a username that is already taken.
 */
public class UsernameTakenException extends Exception {

  public final MessageType messageType; // the MessageType to be sent to the client in the failure response

  /**
   * Constructor for the UsernameTakenException class.
   *
   * @param messageType - a MessageType: the MessageType to be sent to the client in the failure response.
   */
  public UsernameTakenException(MessageType messageType) {
    this.messageType = messageType;
  }

}

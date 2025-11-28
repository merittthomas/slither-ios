package com.slitherios.exceptions;

import com.slitherios.message.MessageType;

/**
 * Custom exception for when there is no Leaderboard associated with the provided Game Code.
 */
public class GameCodeNoLeaderboardException extends Exception {

    public final MessageType messageType; // the MessageType to be sent to the client in the failure response

    /**
     * Constructor for the GameCodeNoLeaderboardException class.
     *
     * @param messageType - a MessageType: the MessageType to be sent to the client in the failure response.
     */
    public GameCodeNoLeaderboardException(MessageType messageType) {
        this.messageType = messageType;
    }
}

package com.slitherios.exceptions;

import com.slitherios.message.MessageType;

public class SocketAlreadyExistsException extends Exception {

    public final MessageType messageType;

    public SocketAlreadyExistsException(MessageType messageType) {
        this.messageType = messageType;
    }
}

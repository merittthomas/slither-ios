package edu.brown.cs32.main;

import edu.brown.cs32.server.SlitherServer;

/**
 * Main class for default use
 */
public class Main {

    /**
     * Default main method for server
     * @param args : any arguments given to default main method
     */
    public static void main(String[] args) {
        System.out.println("Starting Slither+ server on port 9000...");
        final int port = 9000;
        new SlitherServer(port).start();
    }
}

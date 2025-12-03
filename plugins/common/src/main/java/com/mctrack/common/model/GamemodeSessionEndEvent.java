package com.mctrack.common.model;

/**
 * Event for when a player leaves a gamemode server.
 */
public class GamemodeSessionEndEvent {
    private final String sessionUuid;
    private final String playerUuid;

    public GamemodeSessionEndEvent(String sessionUuid, String playerUuid) {
        this.sessionUuid = sessionUuid;
        this.playerUuid = playerUuid;
    }

    public String getSessionUuid() { return sessionUuid; }
    public String getPlayerUuid() { return playerUuid; }
}

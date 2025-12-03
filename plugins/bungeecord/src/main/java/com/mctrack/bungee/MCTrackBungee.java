package com.mctrack.bungee;

import com.mctrack.bungee.command.MCTrackCommand;
import com.mctrack.bungee.listener.PlayerListener;
import com.mctrack.common.api.MCTrackAPI;
import com.mctrack.common.config.MCTrackConfig;
import com.mctrack.common.model.*;
import com.mctrack.common.util.PlayerSession;
import com.mctrack.common.util.SessionManager;
import net.md_5.bungee.api.connection.ProxiedPlayer;
import net.md_5.bungee.api.plugin.Plugin;

import java.io.File;
import java.util.concurrent.TimeUnit;

public class MCTrackBungee extends Plugin {

    private MCTrackConfig config;
    private MCTrackAPI api;

    @Override
    public void onEnable() {
        // Load configuration
        loadConfiguration();

        // Initialize API
        api = new MCTrackAPI(config, message -> getLogger().info(message));
        api.start();

        // Register listeners
        getProxy().getPluginManager().registerListener(this, new PlayerListener(this));

        // Register command
        getProxy().getPluginManager().registerCommand(this, new MCTrackCommand(this));

        // Start heartbeat task
        startHeartbeatTask();

        // Track already online players (for reloads)
        trackOnlinePlayers();

        getLogger().info("MCTrack enabled!");
    }

    @Override
    public void onDisable() {
        // End all sessions
        endAllSessions();

        // Stop API
        if (api != null) {
            api.stop();
        }

        // Clear sessions
        SessionManager.clear();

        getLogger().info("MCTrack disabled!");
    }

    private void loadConfiguration() {
        File configFile = new File(getDataFolder(), "config.yml");
        MCTrackConfig.saveDefault(configFile);
        config = MCTrackConfig.load(configFile);
    }

    public void reloadConfiguration() {
        loadConfiguration();
        api.stop();
        api = new MCTrackAPI(config, message -> getLogger().info(message));
        api.start();
    }

    private void startHeartbeatTask() {
        getProxy().getScheduler().schedule(this, () -> {
            for (PlayerSession session : SessionManager.getAllSessions()) {
                api.trackHeartbeat(new SessionHeartbeatEvent(
                    session.getSessionUuid(),
                    session.getPlayerUuid().toString(),
                    session.getCurrentServer(),
                    null  // No longer tracking vanilla Minecraft gamemode
                ));
            }

            if (config.isDebug()) {
                getLogger().info("[MCTrack] Sent heartbeat for " + SessionManager.getOnlineCount() + " players");
            }
        }, config.getHeartbeatInterval(), config.getHeartbeatInterval(), TimeUnit.SECONDS);
    }

    private void trackOnlinePlayers() {
        for (ProxiedPlayer player : getProxy().getPlayers()) {
            PlayerSession session = SessionManager.createSession(player.getUniqueId(), player.getName());
            if (player.getServer() != null) {
                session.setCurrentServer(player.getServer().getInfo().getName());
            }

            api.trackSessionStart(new SessionStartEvent(
                session.getSessionUuid(),
                player.getUniqueId().toString(),
                player.getName(),
                Platform.JAVA,
                null,
                null,
                null,
                session.getCurrentServer(),
                null
            ));
        }
    }

    private void endAllSessions() {
        for (PlayerSession session : SessionManager.getAllSessions()) {
            api.trackSessionEnd(new SessionEndEvent(
                session.getSessionUuid(),
                session.getPlayerUuid().toString()
            ));
        }
    }

    public MCTrackConfig getMCTrackConfig() {
        return config;
    }

    public MCTrackAPI getApi() {
        return api;
    }
}

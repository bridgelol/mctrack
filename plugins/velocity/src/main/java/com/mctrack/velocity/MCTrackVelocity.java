package com.mctrack.velocity;

import com.google.inject.Inject;
import com.mctrack.common.api.MCTrackAPI;
import com.mctrack.common.config.MCTrackConfig;
import com.mctrack.common.model.*;
import com.mctrack.common.util.PlayerSession;
import com.mctrack.common.util.SessionManager;
import com.mctrack.velocity.command.MCTrackCommand;
import com.mctrack.velocity.listener.PlayerListener;
import com.velocitypowered.api.command.CommandMeta;
import com.velocitypowered.api.event.Subscribe;
import com.velocitypowered.api.event.proxy.ProxyInitializeEvent;
import com.velocitypowered.api.event.proxy.ProxyShutdownEvent;
import com.velocitypowered.api.plugin.Plugin;
import com.velocitypowered.api.plugin.annotation.DataDirectory;
import com.velocitypowered.api.proxy.Player;
import com.velocitypowered.api.proxy.ProxyServer;
import org.slf4j.Logger;

import java.io.File;
import java.nio.file.Path;
import java.util.concurrent.TimeUnit;

@Plugin(
    id = "mctrack",
    name = "MCTrack",
    version = "1.0.0",
    description = "Player analytics and session tracking for Minecraft networks",
    authors = {"MCTrack"},
    url = "https://mctrack.io"
)
public class MCTrackVelocity {

    private final ProxyServer server;
    private final Logger logger;
    private final Path dataDirectory;

    private MCTrackConfig config;
    private MCTrackAPI api;

    @Inject
    public MCTrackVelocity(ProxyServer server, Logger logger, @DataDirectory Path dataDirectory) {
        this.server = server;
        this.logger = logger;
        this.dataDirectory = dataDirectory;
    }

    @Subscribe
    public void onProxyInitialize(ProxyInitializeEvent event) {
        // Load configuration
        loadConfiguration();

        // Initialize API
        api = new MCTrackAPI(config, message -> logger.info(message));
        api.start();

        // Register listeners
        server.getEventManager().register(this, new PlayerListener(this));

        // Register command
        CommandMeta meta = server.getCommandManager().metaBuilder("mctrack")
            .aliases("mct")
            .build();
        server.getCommandManager().register(meta, new MCTrackCommand(this));

        // Start heartbeat task
        startHeartbeatTask();

        // Track already online players (for reloads)
        trackOnlinePlayers();

        logger.info("MCTrack enabled!");
    }

    @Subscribe
    public void onProxyShutdown(ProxyShutdownEvent event) {
        // End all sessions
        endAllSessions();

        // Stop API
        if (api != null) {
            api.stop();
        }

        // Clear sessions
        SessionManager.clear();

        logger.info("MCTrack disabled!");
    }

    private void loadConfiguration() {
        File configFile = new File(dataDirectory.toFile(), "config.yml");
        MCTrackConfig.saveDefault(configFile);
        config = MCTrackConfig.load(configFile);
    }

    public void reloadConfiguration() {
        loadConfiguration();
        api.stop();
        api = new MCTrackAPI(config, message -> logger.info(message));
        api.start();
    }

    private void startHeartbeatTask() {
        server.getScheduler().buildTask(this, () -> {
            for (PlayerSession session : SessionManager.getAllSessions()) {
                api.trackHeartbeat(new SessionHeartbeatEvent(
                    session.getSessionUuid(),
                    session.getPlayerUuid().toString(),
                    session.getCurrentServer(),
                    null  // No longer tracking vanilla Minecraft gamemode
                ));
            }

            if (config.isDebug()) {
                logger.info("[MCTrack] Sent heartbeat for " + SessionManager.getOnlineCount() + " players");
            }
        }).repeat(config.getHeartbeatInterval(), TimeUnit.SECONDS).schedule();
    }

    private void trackOnlinePlayers() {
        for (Player player : server.getAllPlayers()) {
            PlayerSession session = SessionManager.createSession(player.getUniqueId(), player.getUsername());
            player.getCurrentServer().ifPresent(serverConnection ->
                session.setCurrentServer(serverConnection.getServerInfo().getName())
            );

            api.trackSessionStart(new SessionStartEvent(
                session.getSessionUuid(),
                player.getUniqueId().toString(),
                player.getUsername(),
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

    public ProxyServer getServer() {
        return server;
    }

    public Logger getLogger() {
        return logger;
    }

    public MCTrackConfig getMCTrackConfig() {
        return config;
    }

    public MCTrackAPI getApi() {
        return api;
    }
}

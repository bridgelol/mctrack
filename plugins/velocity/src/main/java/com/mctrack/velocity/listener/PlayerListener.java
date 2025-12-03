package com.mctrack.velocity.listener;

import com.mctrack.common.model.*;
import com.mctrack.common.util.PlayerSession;
import com.mctrack.common.util.SessionManager;
import com.mctrack.velocity.MCTrackVelocity;
import com.velocitypowered.api.event.Subscribe;
import com.velocitypowered.api.event.connection.DisconnectEvent;
import com.velocitypowered.api.event.connection.PostLoginEvent;
import com.velocitypowered.api.event.player.ServerConnectedEvent;
import com.velocitypowered.api.proxy.Player;

public class PlayerListener {

    private final MCTrackVelocity plugin;

    public PlayerListener(MCTrackVelocity plugin) {
        this.plugin = plugin;
    }

    @Subscribe
    public void onPostLogin(PostLoginEvent event) {
        Player player = event.getPlayer();

        // Create session
        PlayerSession session = SessionManager.createSession(player.getUniqueId(), player.getUsername());

        // Get IP address if configured
        String ipAddress = null;
        if (plugin.getMCTrackConfig().isTrackIpAddresses() && player.getRemoteAddress() != null) {
            ipAddress = player.getRemoteAddress().getAddress().getHostAddress();
        }

        // Get virtual host (join domain) if configured
        String joinDomain = null;
        if (plugin.getMCTrackConfig().isTrackJoinDomain()) {
            player.getVirtualHost().ifPresent(host -> {
                // Store temporarily - will be applied in the session start event
            });
            joinDomain = player.getVirtualHost().map(host -> host.getHostString()).orElse(null);
        }

        // Track session start
        plugin.getApi().trackSessionStart(new SessionStartEvent(
            session.getSessionUuid(),
            player.getUniqueId().toString(),
            player.getUsername(),
            Platform.JAVA,
            null,
            ipAddress,
            joinDomain,
            null,
            null
        ));

        if (plugin.getMCTrackConfig().isDebug()) {
            plugin.getLogger().info("[MCTrack] Player " + player.getUsername() + " joined - Session: " + session.getSessionUuid());
        }
    }

    @Subscribe
    public void onDisconnect(DisconnectEvent event) {
        Player player = event.getPlayer();

        // Get and remove session
        PlayerSession session = SessionManager.removeSession(player.getUniqueId());

        if (session != null) {
            plugin.getApi().trackSessionEnd(new SessionEndEvent(
                session.getSessionUuid(),
                player.getUniqueId().toString()
            ));

            if (plugin.getMCTrackConfig().isDebug()) {
                plugin.getLogger().info("[MCTrack] Player " + player.getUsername() + " quit - Session: " + session.getSessionUuid());
            }
        }
    }

    @Subscribe
    public void onServerConnected(ServerConnectedEvent event) {
        Player player = event.getPlayer();
        PlayerSession session = SessionManager.getSession(player.getUniqueId());
        if (session == null) return;

        String toServer = event.getServer().getServerInfo().getName();
        String fromServer = event.getPreviousServer()
            .map(server -> server.getServerInfo().getName())
            .orElse(null);

        // Update session
        SessionManager.updateServer(player.getUniqueId(), toServer);

        // Track server switch (only if there was a previous server)
        if (fromServer != null) {
            plugin.getApi().trackServerSwitch(new ServerSwitchEvent(
                session.getSessionUuid(),
                player.getUniqueId().toString(),
                fromServer,
                toServer
            ));

            if (plugin.getMCTrackConfig().isDebug()) {
                plugin.getLogger().info("[MCTrack] Player " + player.getUsername() + " switched server: " + fromServer + " -> " + toServer);
            }
        }
    }
}

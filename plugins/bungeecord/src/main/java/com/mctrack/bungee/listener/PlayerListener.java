package com.mctrack.bungee.listener;

import com.mctrack.bungee.MCTrackBungee;
import com.mctrack.common.model.*;
import com.mctrack.common.util.PlayerSession;
import com.mctrack.common.util.SessionManager;
import net.md_5.bungee.api.connection.ProxiedPlayer;
import net.md_5.bungee.api.event.PlayerDisconnectEvent;
import net.md_5.bungee.api.event.PostLoginEvent;
import net.md_5.bungee.api.event.ServerConnectedEvent;
import net.md_5.bungee.api.plugin.Listener;
import net.md_5.bungee.event.EventHandler;
import net.md_5.bungee.event.EventPriority;

public class PlayerListener implements Listener {

    private final MCTrackBungee plugin;

    public PlayerListener(MCTrackBungee plugin) {
        this.plugin = plugin;
    }

    @EventHandler(priority = EventPriority.HIGHEST)
    public void onPostLogin(PostLoginEvent event) {
        ProxiedPlayer player = event.getPlayer();

        // Create session
        PlayerSession session = SessionManager.createSession(player.getUniqueId(), player.getName());

        // Get IP address if configured
        String ipAddress = null;
        if (plugin.getMCTrackConfig().isTrackIpAddresses() && player.getSocketAddress() != null) {
            ipAddress = player.getSocketAddress().toString().replace("/", "").split(":")[0];
        }

        // Get virtual host (join domain) if configured
        String joinDomain = null;
        if (plugin.getMCTrackConfig().isTrackJoinDomain() && player.getPendingConnection().getVirtualHost() != null) {
            joinDomain = player.getPendingConnection().getVirtualHost().getHostString();
        }

        // Track session start
        plugin.getApi().trackSessionStart(new SessionStartEvent(
            session.getSessionUuid(),
            player.getUniqueId().toString(),
            player.getName(),
            Platform.JAVA,
            null,
            ipAddress,
            joinDomain,
            null,
            null
        ));

        if (plugin.getMCTrackConfig().isDebug()) {
            plugin.getLogger().info("[MCTrack] Player " + player.getName() + " joined - Session: " + session.getSessionUuid());
        }
    }

    @EventHandler(priority = EventPriority.HIGHEST)
    public void onDisconnect(PlayerDisconnectEvent event) {
        ProxiedPlayer player = event.getPlayer();

        // Get and remove session
        PlayerSession session = SessionManager.removeSession(player.getUniqueId());

        if (session != null) {
            plugin.getApi().trackSessionEnd(new SessionEndEvent(
                session.getSessionUuid(),
                player.getUniqueId().toString()
            ));

            if (plugin.getMCTrackConfig().isDebug()) {
                plugin.getLogger().info("[MCTrack] Player " + player.getName() + " quit - Session: " + session.getSessionUuid());
            }
        }
    }

    @EventHandler(priority = EventPriority.HIGHEST)
    public void onServerConnected(ServerConnectedEvent event) {
        ProxiedPlayer player = event.getPlayer();
        PlayerSession session = SessionManager.getSession(player.getUniqueId());
        if (session == null) return;

        String toServer = event.getServer().getInfo().getName();
        String fromServer = session.getCurrentServer();

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
                plugin.getLogger().info("[MCTrack] Player " + player.getName() + " switched server: " + fromServer + " -> " + toServer);
            }
        }
    }
}

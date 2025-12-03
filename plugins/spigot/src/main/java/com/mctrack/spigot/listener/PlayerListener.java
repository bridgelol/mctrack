package com.mctrack.spigot.listener;

import com.mctrack.common.config.MCTrackConfig;
import com.mctrack.common.model.*;
import com.mctrack.common.util.PlayerSession;
import com.mctrack.common.util.SessionManager;
import com.mctrack.spigot.MCTrackPlugin;
import org.bukkit.entity.Player;
import org.bukkit.event.EventHandler;
import org.bukkit.event.EventPriority;
import org.bukkit.event.Listener;
import org.bukkit.event.player.PlayerJoinEvent;
import org.bukkit.event.player.PlayerQuitEvent;

public class PlayerListener implements Listener {

    private final MCTrackPlugin plugin;

    public PlayerListener(MCTrackPlugin plugin) {
        this.plugin = plugin;
    }

    @EventHandler(priority = EventPriority.MONITOR)
    public void onPlayerJoin(PlayerJoinEvent event) {
        Player player = event.getPlayer();
        MCTrackConfig config = plugin.getMCTrackConfig();

        // Create session
        PlayerSession session = SessionManager.createSession(player.getUniqueId(), player.getName());
        session.setCurrentServer(config.getServerName());

        // Get IP address if configured
        String ipAddress = null;
        if (config.isTrackIpAddresses() && player.getAddress() != null) {
            ipAddress = player.getAddress().getAddress().getHostAddress();
        }

        // Track network session if no-proxy mode (standalone server)
        if (config.isNoProxy()) {
            String joinDomain = null;
            if (config.isTrackJoinDomain() && player.getAddress() != null) {
                joinDomain = player.getAddress().getHostName();
            }

            plugin.getApi().trackSessionStart(new SessionStartEvent(
                session.getSessionUuid(),
                player.getUniqueId().toString(),
                player.getName(),
                Platform.JAVA,
                null,
                ipAddress,
                joinDomain,
                config.getServerName(),
                null
            ));

            if (config.isDebug()) {
                plugin.getLogger().info("[MCTrack] Network session started for " + player.getName());
            }
        }

        // Track gamemode session if API key is scoped to a gamemode
        if (config.hasGamemode()) {
            plugin.getApi().trackGamemodeSessionStart(new GamemodeSessionStartEvent(
                session.getGamemodeSessionUuid(),
                player.getUniqueId().toString(),
                player.getName(),
                config.getGamemodeId(),
                config.getServerName(),
                ipAddress,
                Platform.JAVA.name().toLowerCase(),
                null
            ));

            if (config.isDebug()) {
                plugin.getLogger().info("[MCTrack] Gamemode session started for " + player.getName());
            }
        }

        if (config.isDebug()) {
            plugin.getLogger().info("[MCTrack] Player " + player.getName() + " joined - Session: " + session.getSessionUuid());
        }
    }

    @EventHandler(priority = EventPriority.MONITOR)
    public void onPlayerQuit(PlayerQuitEvent event) {
        Player player = event.getPlayer();
        MCTrackConfig config = plugin.getMCTrackConfig();

        // Get and remove session
        PlayerSession session = SessionManager.removeSession(player.getUniqueId());

        if (session != null) {
            // End network session if no-proxy mode
            if (config.isNoProxy()) {
                plugin.getApi().trackSessionEnd(new SessionEndEvent(
                    session.getSessionUuid(),
                    player.getUniqueId().toString()
                ));

                if (config.isDebug()) {
                    plugin.getLogger().info("[MCTrack] Network session ended for " + player.getName());
                }
            }

            // End gamemode session if API key is scoped to a gamemode
            if (config.hasGamemode()) {
                plugin.getApi().trackGamemodeSessionEnd(new GamemodeSessionEndEvent(
                    session.getGamemodeSessionUuid(),
                    player.getUniqueId().toString()
                ));

                if (config.isDebug()) {
                    plugin.getLogger().info("[MCTrack] Gamemode session ended for " + player.getName());
                }
            }

            if (config.isDebug()) {
                plugin.getLogger().info("[MCTrack] Player " + player.getName() + " quit - Session: " + session.getSessionUuid());
            }
        }
    }
}

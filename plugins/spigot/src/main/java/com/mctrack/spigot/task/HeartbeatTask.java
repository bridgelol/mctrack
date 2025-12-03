package com.mctrack.spigot.task;

import com.mctrack.common.model.SessionHeartbeatEvent;
import com.mctrack.common.util.PlayerSession;
import com.mctrack.common.util.SessionManager;
import com.mctrack.spigot.MCTrackPlugin;
import org.bukkit.scheduler.BukkitRunnable;

public class HeartbeatTask extends BukkitRunnable {

    private final MCTrackPlugin plugin;

    public HeartbeatTask(MCTrackPlugin plugin) {
        this.plugin = plugin;
    }

    @Override
    public void run() {
        for (PlayerSession session : SessionManager.getAllSessions()) {
            plugin.getApi().trackHeartbeat(new SessionHeartbeatEvent(
                session.getSessionUuid(),
                session.getPlayerUuid().toString(),
                session.getCurrentServer(),
                null  // No longer tracking vanilla Minecraft gamemode
            ));
        }

        if (plugin.getMCTrackConfig().isDebug()) {
            plugin.getLogger().info("[MCTrack] Sent heartbeat for " + SessionManager.getOnlineCount() + " players");
        }
    }
}

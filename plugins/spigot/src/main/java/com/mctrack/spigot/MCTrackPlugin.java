package com.mctrack.spigot;

import com.mctrack.common.api.MCTrackAPI;
import com.mctrack.common.config.MCTrackConfig;
import com.mctrack.common.model.*;
import com.mctrack.common.util.PlayerSession;
import com.mctrack.common.util.SessionManager;
import com.mctrack.spigot.listener.PlayerListener;
import com.mctrack.spigot.task.HeartbeatTask;
import org.bukkit.command.Command;
import org.bukkit.command.CommandSender;
import org.bukkit.entity.Player;
import org.bukkit.plugin.java.JavaPlugin;

import java.io.File;

public class MCTrackPlugin extends JavaPlugin {

    private MCTrackConfig config;
    private MCTrackAPI api;
    private HeartbeatTask heartbeatTask;

    @Override
    public void onEnable() {
        // Load configuration
        loadConfiguration();

        // Initialize API
        api = new MCTrackAPI(config, message -> getLogger().info(message));
        api.start();

        // Register listeners
        getServer().getPluginManager().registerEvents(new PlayerListener(this), this);

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

        // Stop heartbeat
        if (heartbeatTask != null) {
            heartbeatTask.cancel();
        }

        // Stop API
        if (api != null) {
            api.stop();
        }

        // Clear sessions
        SessionManager.clear();

        getLogger().info("MCTrack disabled!");
    }

    @Override
    public boolean onCommand(CommandSender sender, Command command, String label, String[] args) {
        if (command.getName().equalsIgnoreCase("mctrack")) {
            if (!sender.hasPermission("mctrack.admin")) {
                sender.sendMessage("§cYou don't have permission to use this command.");
                return true;
            }

            String subCommand = args.length > 0 ? args[0].toLowerCase() : "";

            switch (subCommand) {
                case "reload":
                    loadConfiguration();
                    api.stop();
                    api = new MCTrackAPI(config, message -> getLogger().info(message));
                    api.start();
                    sender.sendMessage("§aMCTrack configuration reloaded!");
                    break;
                case "status":
                    sender.sendMessage("§6MCTrack Status:");
                    sender.sendMessage("§7  Configured: " + (config.isConfigured() ? "§aYes" : "§cNo"));
                    sender.sendMessage("§7  Server Name: §f" + config.getServerName());
                    sender.sendMessage("§7  Online Players: §f" + SessionManager.getOnlineCount());
                    sender.sendMessage("§7  Debug Mode: " + (config.isDebug() ? "§aEnabled" : "§7Disabled"));
                    break;
                default:
                    sender.sendMessage("§6MCTrack Commands:");
                    sender.sendMessage("§7  /mctrack reload §f- Reload configuration");
                    sender.sendMessage("§7  /mctrack status §f- Show plugin status");
                    break;
            }
            return true;
        }
        return false;
    }

    private void loadConfiguration() {
        File configFile = new File(getDataFolder(), "config.yml");
        MCTrackConfig.saveDefault(configFile);
        config = MCTrackConfig.load(configFile);
    }

    private void startHeartbeatTask() {
        if (heartbeatTask != null) {
            heartbeatTask.cancel();
        }
        heartbeatTask = new HeartbeatTask(this);
        heartbeatTask.runTaskTimerAsynchronously(
            this,
            config.getHeartbeatInterval() * 20L,
            config.getHeartbeatInterval() * 20L
        );
    }

    private void trackOnlinePlayers() {
        for (Player player : getServer().getOnlinePlayers()) {
            PlayerSession session = SessionManager.createSession(player.getUniqueId(), player.getName());
            session.setCurrentServer(config.getServerName());

            // Track network session if no-proxy mode
            if (config.isNoProxy()) {
                api.trackSessionStart(new SessionStartEvent(
                    session.getSessionUuid(),
                    player.getUniqueId().toString(),
                    player.getName(),
                    Platform.JAVA,
                    null,
                    null,
                    null,
                    config.getServerName(),
                    null
                ));
            }

            // Track gamemode session if API key is scoped to a gamemode
            if (config.hasGamemode()) {
                api.trackGamemodeSessionStart(new GamemodeSessionStartEvent(
                    session.getGamemodeSessionUuid(),
                    player.getUniqueId().toString(),
                    player.getName(),
                    config.getGamemodeId(),
                    config.getServerName(),
                    null,
                    Platform.JAVA.name().toLowerCase(),
                    null
                ));
            }
        }
    }

    private void endAllSessions() {
        for (PlayerSession session : SessionManager.getAllSessions()) {
            // End network session if no-proxy mode
            if (config.isNoProxy()) {
                api.trackSessionEnd(new SessionEndEvent(
                    session.getSessionUuid(),
                    session.getPlayerUuid().toString()
                ));
            }

            // End gamemode session if API key is scoped to a gamemode
            if (config.hasGamemode()) {
                api.trackGamemodeSessionEnd(new GamemodeSessionEndEvent(
                    session.getGamemodeSessionUuid(),
                    session.getPlayerUuid().toString()
                ));
            }
        }
    }

    public MCTrackConfig getMCTrackConfig() {
        return config;
    }

    public MCTrackAPI getApi() {
        return api;
    }
}

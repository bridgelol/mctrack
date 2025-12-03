package com.mctrack.velocity.command;

import com.mctrack.common.util.SessionManager;
import com.mctrack.velocity.MCTrackVelocity;
import com.velocitypowered.api.command.SimpleCommand;
import net.kyori.adventure.text.Component;
import net.kyori.adventure.text.format.NamedTextColor;

import java.util.List;
import java.util.concurrent.CompletableFuture;

public class MCTrackCommand implements SimpleCommand {

    private final MCTrackVelocity plugin;

    public MCTrackCommand(MCTrackVelocity plugin) {
        this.plugin = plugin;
    }

    @Override
    public void execute(Invocation invocation) {
        if (!invocation.source().hasPermission("mctrack.admin")) {
            invocation.source().sendMessage(
                Component.text("You don't have permission to use this command.", NamedTextColor.RED)
            );
            return;
        }

        String[] args = invocation.arguments();
        String subCommand = args.length > 0 ? args[0].toLowerCase() : "";

        switch (subCommand) {
            case "reload":
                plugin.reloadConfiguration();
                invocation.source().sendMessage(
                    Component.text("MCTrack configuration reloaded!", NamedTextColor.GREEN)
                );
                break;
            case "status":
                invocation.source().sendMessage(Component.text("MCTrack Status:", NamedTextColor.GOLD));
                invocation.source().sendMessage(
                    Component.text("  Configured: ", NamedTextColor.GRAY)
                        .append(plugin.getMCTrackConfig().isConfigured()
                            ? Component.text("Yes", NamedTextColor.GREEN)
                            : Component.text("No", NamedTextColor.RED))
                );
                invocation.source().sendMessage(
                    Component.text("  Server Name: ", NamedTextColor.GRAY)
                        .append(Component.text(plugin.getMCTrackConfig().getServerName(), NamedTextColor.WHITE))
                );
                invocation.source().sendMessage(
                    Component.text("  Online Players: ", NamedTextColor.GRAY)
                        .append(Component.text(String.valueOf(SessionManager.getOnlineCount()), NamedTextColor.WHITE))
                );
                invocation.source().sendMessage(
                    Component.text("  Debug Mode: ", NamedTextColor.GRAY)
                        .append(plugin.getMCTrackConfig().isDebug()
                            ? Component.text("Enabled", NamedTextColor.GREEN)
                            : Component.text("Disabled", NamedTextColor.GRAY))
                );
                break;
            default:
                invocation.source().sendMessage(Component.text("MCTrack Commands:", NamedTextColor.GOLD));
                invocation.source().sendMessage(
                    Component.text("  /mctrack reload ", NamedTextColor.GRAY)
                        .append(Component.text("- Reload configuration", NamedTextColor.WHITE))
                );
                invocation.source().sendMessage(
                    Component.text("  /mctrack status ", NamedTextColor.GRAY)
                        .append(Component.text("- Show plugin status", NamedTextColor.WHITE))
                );
                break;
        }
    }

    @Override
    public CompletableFuture<List<String>> suggestAsync(Invocation invocation) {
        if (invocation.arguments().length <= 1) {
            return CompletableFuture.completedFuture(List.of("reload", "status"));
        }
        return CompletableFuture.completedFuture(List.of());
    }

    @Override
    public boolean hasPermission(Invocation invocation) {
        return invocation.source().hasPermission("mctrack.admin");
    }
}

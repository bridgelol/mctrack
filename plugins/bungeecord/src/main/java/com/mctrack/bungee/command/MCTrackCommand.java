package com.mctrack.bungee.command;

import com.mctrack.bungee.MCTrackBungee;
import com.mctrack.common.util.SessionManager;
import net.md_5.bungee.api.ChatColor;
import net.md_5.bungee.api.CommandSender;
import net.md_5.bungee.api.chat.TextComponent;
import net.md_5.bungee.api.plugin.Command;
import net.md_5.bungee.api.plugin.TabExecutor;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

public class MCTrackCommand extends Command implements TabExecutor {

    private final MCTrackBungee plugin;

    public MCTrackCommand(MCTrackBungee plugin) {
        super("mctrack", "mctrack.admin", "mct");
        this.plugin = plugin;
    }

    @Override
    public void execute(CommandSender sender, String[] args) {
        if (!sender.hasPermission("mctrack.admin")) {
            sender.sendMessage(new TextComponent(ChatColor.RED + "You don't have permission to use this command."));
            return;
        }

        String subCommand = args.length > 0 ? args[0].toLowerCase() : "";

        switch (subCommand) {
            case "reload":
                plugin.reloadConfiguration();
                sender.sendMessage(new TextComponent(ChatColor.GREEN + "MCTrack configuration reloaded!"));
                break;
            case "status":
                sender.sendMessage(new TextComponent(ChatColor.GOLD + "MCTrack Status:"));
                sender.sendMessage(new TextComponent(ChatColor.GRAY + "  Configured: " +
                    (plugin.getMCTrackConfig().isConfigured() ? ChatColor.GREEN + "Yes" : ChatColor.RED + "No")));
                sender.sendMessage(new TextComponent(ChatColor.GRAY + "  Server Name: " +
                    ChatColor.WHITE + plugin.getMCTrackConfig().getServerName()));
                sender.sendMessage(new TextComponent(ChatColor.GRAY + "  Online Players: " +
                    ChatColor.WHITE + SessionManager.getOnlineCount()));
                sender.sendMessage(new TextComponent(ChatColor.GRAY + "  Debug Mode: " +
                    (plugin.getMCTrackConfig().isDebug() ? ChatColor.GREEN + "Enabled" : ChatColor.GRAY + "Disabled")));
                break;
            default:
                sender.sendMessage(new TextComponent(ChatColor.GOLD + "MCTrack Commands:"));
                sender.sendMessage(new TextComponent(ChatColor.GRAY + "  /mctrack reload " +
                    ChatColor.WHITE + "- Reload configuration"));
                sender.sendMessage(new TextComponent(ChatColor.GRAY + "  /mctrack status " +
                    ChatColor.WHITE + "- Show plugin status"));
                break;
        }
    }

    @Override
    public Iterable<String> onTabComplete(CommandSender sender, String[] args) {
        if (args.length <= 1) {
            return Arrays.asList("reload", "status");
        }
        return new ArrayList<>();
    }
}

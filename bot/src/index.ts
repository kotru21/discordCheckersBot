import {
  Client,
  Events,
  GatewayIntentBits,
} from "discord.js";
import { config } from "./config";

const LAUNCH_COMMANDS = new Set(["checkers", "launch"]);

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once(Events.ClientReady, (readyClient) => {
  console.warn(`Bot online as ${readyClient.user.tag}`);
});

client.on(Events.Error, (error) => {
  console.error("Discord client error:", error);
});

client.on(Events.Warn, (message) => {
  console.warn("Discord client warning:", message);
});

client.on(Events.ShardError, (error) => {
  console.error("Discord shard error:", error);
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) {
    return;
  }
  if (!LAUNCH_COMMANDS.has(interaction.commandName)) {
    return;
  }

  try {
    await interaction.launchActivity({ withResponse: true });
  } catch (error) {
    console.error("launchActivity failed:", error);
    const message =
      error instanceof Error ? error.message : "Failed to launch Activity";

    if (interaction.replied || interaction.deferred) {
      await interaction
        .followUp({
          content: `Could not launch Activity: ${message}`,
          ephemeral: true,
        })
        .catch((followUpError) => {
          console.error("followUp failed:", followUpError);
        });
      return;
    }

    await interaction
      .reply({
        content: `Could not launch Activity: ${message}`,
        ephemeral: true,
      })
      .catch((replyError) => {
        console.error("reply failed:", replyError);
      });
  }
});

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled rejection:", reason);
});

try {
  await client.login(config.token);
} catch (error) {
  console.error("Bot login failed:", error);
  process.exit(1);
}

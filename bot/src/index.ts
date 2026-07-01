import { Client, GatewayIntentBits } from "discord.js";
import { config } from "./config";

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand() || interaction.commandName !== "checkers") {
    return;
  }
  await interaction.launchActivity({ withResponse: true });
});

await client.login(config.token);

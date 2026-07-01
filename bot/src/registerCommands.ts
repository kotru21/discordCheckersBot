import { REST, Routes, SlashCommandBuilder } from "discord.js";
import { config } from "./config";

const commands = [
  new SlashCommandBuilder()
    .setName("checkers")
    .setDescription("Launch Beagle vs Corgi 3D checkers Activity")
    .toJSON(),
];

const rest = new REST().setToken(config.token);

if (config.guildId) {
  await rest.put(Routes.applicationGuildCommands(config.clientId, config.guildId), {
    body: commands,
  });
  console.warn(`Registered guild commands for guild ${config.guildId}`);
} else {
  await rest.put(Routes.applicationCommands(config.clientId), { body: commands });
  console.warn("Registered global commands");
}

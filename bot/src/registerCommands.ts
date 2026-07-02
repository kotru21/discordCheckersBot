import {
  ApplicationCommandType,
  REST,
  Routes,
  SlashCommandBuilder,
  type RESTPostAPIApplicationCommandsJSONBody,
} from "discord.js";
import { config } from "./config";

type StoredCommand = RESTPostAPIApplicationCommandsJSONBody & {
  id?: string;
  application_id?: string;
  version?: string;
};

function toRegisterBody(command: StoredCommand): RESTPostAPIApplicationCommandsJSONBody {
  const { id: _id, application_id: _appId, version: _version, ...body } = command;
  return body;
}

function buildCheckersCommand(): RESTPostAPIApplicationCommandsJSONBody {
  return new SlashCommandBuilder()
    .setName("checkers")
    .setDescription("Launch Beagle vs Corgi 3D checkers Activity")
    .toJSON();
}

async function buildGlobalCommandSet(
  rest: REST
): Promise<RESTPostAPIApplicationCommandsJSONBody[]> {
  const existing = (await rest.get(
    Routes.applicationCommands(config.clientId)
  )) as StoredCommand[];

  const entryPoints = existing.filter(
    (command) => command.type === ApplicationCommandType.PrimaryEntryPoint
  );

  return [...entryPoints.map(toRegisterBody), buildCheckersCommand()];
}

const rest = new REST().setToken(config.token);
const checkersCommand = buildCheckersCommand();

try {
  if (config.guildId) {
    await rest.put(
      Routes.applicationGuildCommands(config.clientId, config.guildId),
      { body: [checkersCommand] }
    );
    console.warn(`Registered guild /checkers for guild ${config.guildId}`);
  } else {
    const body = await buildGlobalCommandSet(rest);
    await rest.put(Routes.applicationCommands(config.clientId), { body });
    console.warn(
      `Registered global commands (${body.length} total, preserving Activity Entry Point)`
    );
  }
} catch (error) {
  console.error("Failed to register slash commands:", error);
  process.exit(1);
}

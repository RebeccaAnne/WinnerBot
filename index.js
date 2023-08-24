const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, Events, GatewayIntentBits } = require('discord.js');
const { token } = require('./config.json');
const { CronJob } = require('cron');
const dayjs = require('dayjs');
const { ServerResponse } = require('node:http');
const { scheduleWinnerExpirationCheck, winnerExpirationCheck } = require('./timers');
const { Mutex } = require('async-mutex');

// Create a new client instance
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// Configure commands
client.commands = new Collection();

const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

console.log("Command files:");

for (const file of commandFiles) {
	const filePath = path.join(commandsPath, file);
	const command = require(filePath);
	console.log(file);
	// Set a new item in the Collection with the key as the command name and the value as the exported module
	if ('data' in command && 'execute' in command) {
		client.commands.set(command.data.name, command);
	} else {
		console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
	}
}


let winnerListFile = require("./winner-and-event-data.json");
const dataPath = path.join(__dirname, 'data');
const serverConfigFiles = fs.readdirSync("./data").filter(file => file.startsWith('server-config-'));


for (const serverConfigFile of serverConfigFiles) {
	const filePath = path.join(dataPath, serverConfigFile);
	const serverConfig = require(filePath);

	winnerList = winnerListFile[serverConfig.guildId];

	if (!winnerList.currentTerrorThreshold) {
		winnerList.currentTerrorThreshold = serverConfig.terrorThreshold;
	}
}

fs.writeFileSync("winner-and-event-data.json", JSON.stringify(winnerListFile), () => { });


client.on(Events.InteractionCreate, async interaction => {
	if (!interaction.isChatInputCommand()) return;

	const command = interaction.client.commands.get(interaction.commandName);

	if (!command) {
		console.error(`No command matching ${interaction.commandName} was found.`);
		return;
	}

	try {
		await command.execute(interaction);
	} catch (error) {
		console.error(error);
		if (interaction.replied || interaction.deferred) {
			await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
		} else {
			await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
		}
	}
});


// When the client is ready, run this code (only once)
// We use 'c' for the event parameter to keep it separate from the already defined 'client'
client.once(Events.ClientReady, async c => {
	console.log(`Ready! Logged in as ${c.user.tag}`);

	for (const serverConfigFile of serverConfigFiles) {

		const filePath = path.join(dataPath, serverConfigFile);
		const serverConfig = require(filePath);

		let guild = await client.guilds.fetch(serverConfig.guildId);

		await winnerExpirationCheck(guild, serverConfig);
		for (const winner of winnerList.winners) {
			await scheduleWinnerExpirationCheck(winner, guild, serverConfig);
		}

		await eventExpirationCheck(guild, serverConfig);
		for (const series of winnerList.eventSeries) {
			await scheduleSeriesTimers(serverConfig, guild, series)
		}

		// Run a just-in-case expiration for winners and events at midnight
		console.log("Scheduling check for midnight for " + serverConfig.guildId);
		const job = new CronJob("0 0 0 * * *", async function () {
			await expirationCheck(guild, serverConfig);
			await eventExpirationCheck(guild, serverConfig);
		}, null, true);
	}
});

// Log in to Discord with your client's token
client.login(token);


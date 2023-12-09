const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, Events, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const { token } = require('./config.json');
const { CronJob } = require('cron');
const dayjs = require('dayjs');
const { ServerResponse } = require('node:http');
const { scheduleWinnerExpirationCheck, winnerExpirationCheck } = require('./timers');
const { Mutex } = require('async-mutex');
const { getEventsDisplyString } = require('./showEventsHelper')

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


let dataFile = require("./winner-and-event-data.json");
const { channel } = require('node:diagnostics_channel');
const dataPath = path.join(__dirname, 'data');
const serverConfigFiles = fs.readdirSync("./data").filter(file => file.startsWith('server-config-'));


for (const serverConfigFile of serverConfigFiles) {
	const filePath = path.join(dataPath, serverConfigFile);
	const serverConfig = require(filePath);

	if (!dataFile[serverConfig.guildId]) {
		dataFile[serverConfig.guildId] = {};
	}
	let serverData = dataFile[serverConfig.guildId];

	if (!serverData.currentTerrorThreshold) {
		serverData.currentTerrorThreshold = serverConfig.terrorThreshold;
	}
}

fs.writeFileSync("winner-and-event-data.json", JSON.stringify(dataFile), () => { });


client.on(Events.InteractionCreate, async interaction => {
	if (interaction.isChatInputCommand()) {

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
	}
	else if (interaction.isAutocomplete()) {
		const command = interaction.client.commands.get(interaction.commandName);

		if (!command) {
			console.error(`No command matching ${interaction.commandName} was found.`);
			return;
		}

		try {
			await command.autocomplete(interaction);
		} catch (error) {
			console.error(error);
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
		let serverData = dataFile[serverConfig.guildId];

		let guild = await client.guilds.fetch(serverConfig.guildId);

		await winnerExpirationCheck(guild, serverConfig);
		for (const winner of serverData.winners) {
			await scheduleWinnerExpirationCheck(winner, guild, serverConfig);
		}

		await eventExpirationCheck(guild, serverConfig);
		for (const series of serverData.eventSeries) {
			await scheduleSeriesTimers(serverConfig, guild, series)
		}

		let nMinusOneHit = await nMinusOneCheck(guild, serverConfig);
		if (!nMinusOneHit) {
			// If we trigger n-1 that will schedule the next check. If we don't, schedule on here
			// (This seems hacky, not sure how to do it better)
			await scheduleNMinusOneCheck(guild, serverConfig);
		}


		if (serverConfig.eventUpdateSchedule) {
			console.log("Scheduling event updates for " + serverConfig.guildId);
			const upcomingEventsJob = new CronJob(serverConfig.eventUpdateSchedule, async function () {

				let filename = "winner-and-event-data.json";
				let dataFile = require("./" + filename);
				if (dataFile[guild.id] == null) {
					dataFile[guild.id] = {};
				}
				let serverData = dataFile[guild.id];

				let description = await getEventsDisplyString(guild, serverData.eventSeries, false, true);
				if (description) {
					let channel = await client.channels.fetch(serverConfig.eventUpdateChannel, { force: true });

					await channel.send({
						embeds: [new EmbedBuilder()
							.setTitle("Upcoming Events ")
							.setDescription(description)
							.setColor(0xff)
							.setFooter({ text: "(Use /show-event-details for more information on an event)" })]
					});
				}
			}, null, true, "America/Los_Angeles");
		}

		// Run a just-in-case expiration for everything at midnight
		console.log("Scheduling check for midnight for " + serverConfig.guildId);
		const job = new CronJob("0 0 0 * * *", async function () {
			await winnerExpirationCheck(guild, serverConfig);
			await eventExpirationCheck(guild, serverConfig);
			await nMinusOneCheck(guild, serverConfig);
		}, null, true);
	}
});

// Log in to Discord with your client's token
client.login(token);


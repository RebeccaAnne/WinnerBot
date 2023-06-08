// Require the necessary discord.js classes
const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, Events, GatewayIntentBits } = require('discord.js');
const { token } = require('./config.json');
const { CronJob } = require('cron');
const dayjs = require('dayjs');
const { ServerResponse } = require('node:http');

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

let winnerListFile = require("./winner-arrays.json");
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

fs.writeFileSync("winner-arrays.json", JSON.stringify(winnerListFile), () => { });

const job = new CronJob("0 0 0 * * *", async function () {

	try {
		console.log(dayjs().format("YYYY-M-D") + "Checking for expired winners")

		for (const serverConfigFile of serverConfigFiles) {

			const filePath = path.join(dataPath, serverConfigFile);
			const serverConfig = require(filePath);

			winnerList = winnerListFile[serverConfig.guildId];

			// Keep track of the filtered members so we can remove their roles. 
			// Don't try to do this in the filter because async and filter don't play nicely together
			let filteredMembers = [];
			winnerList.winners = await winnerList.winners.filter(winner => {
				let winDate = dayjs(winner.date);
				let dateCutoff = dayjs().subtract(serverConfig.winDurationInDays, "day");

				if (!winDate.isAfter(dateCutoff)) {
					console.log(winner.username + "'s win has expired");
					filteredMembers.push(winner.id);
					return false;
				}
				else {
					return true;
				}
			});

			// Remove all filtered members from the winner role
			let guild = await client.guilds.fetch(serverConfig.guildId);
			for (const filteredMember of filteredMembers) {
				let winnerMember = await guild.members.fetch(filteredMember);
				await winnerMember.roles.remove(serverConfig.winnerRoleId);
			}
		};
		fs.writeFileSync("winner-arrays.json", JSON.stringify(winnerListFile), () => { });
	}
	catch (error) {
		console.log("CronJob failed. Error: " + error);
	}
}, null, true);

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
client.once(Events.ClientReady, c => {
	console.log(`Ready! Logged in as ${c.user.tag}`);
});

// Log in to Discord with your client's token
client.login(token);
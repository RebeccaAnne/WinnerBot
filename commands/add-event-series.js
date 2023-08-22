var fs = require("fs");
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const dayjs = require('dayjs');
const { modjsPermissionChannelCheck } = require('../utils');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('add-event-series')
		.setDescription('Add an event series to the bot for event reminders')
		.addStringOption(option =>
			option.setName('name')
				.setDescription('Name of the event series')
				.setRequired(true))
		.addUserOption(option =>
			option.setName('organizer')
				.setDescription('The user in charge of organizing the event series.')
				.setRequired(true)),
	async execute(interaction) {
		let seriesName = interaction.options.getString('name');
		let organizer = interaction.options.getMember('organizer');
		let guild = interaction.guild;

		// Does this user have permission to add an event series?
		let permissionErrorMessage = await modjsPermissionChannelCheck(interaction);
		if (permissionErrorMessage) {
			await interaction.reply({
				content: permissionErrorMessage, ephemeral: true
			});
			return;
		}

		// Load the data from file
		let newSeries = {};
		let id;
		let succeeded = await getMutex().runExclusive(async () => {

			let filename = "winner-and-event-data.json";
			let dataFile = require("../" + filename);
			if (dataFile[guild.id] == null) {
				dataFile[guild.id] = {};
			}

			let serverData = dataFile[guild.id];


			// Check if there's already a series with this title
			for (let existingSeries of serverData.eventSeries) {
				if (seriesName == existingSeries.name) {
					await interaction.reply({
						content: seriesName + " already exists!", ephemeral: true
					});
					return false;
				}
			};

			id = await getNewId(guild.id);

			newSeries = {
				name: seriesName,
				id: id,
				organizers: [
					{
						username: organizer.displayName,
						id: organizer.id
					}],
				events: []
			}

			serverData.eventSeries.push(newSeries);

			fs.writeFileSync(filename, JSON.stringify(dataFile), () => { });
			return true;
		});
		if (!succeeded) { return; }

		// reply to the command
		await interaction.reply({
			embeds: [new EmbedBuilder()
				.setDescription(
					"**" + newSeries.name + "**" + " organized by " + "**" + newSeries.organizers[0].username + "**" + 
					"\nId: " + id)
				.setTitle("New Event Series Added")]
		});
	},
};

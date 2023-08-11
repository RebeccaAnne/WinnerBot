var fs = require("fs");
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const dayjs = require('dayjs');
const { modPermissionCheck } = require('../utils');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('add-event-series')
		.setDescription('Add an event series to the bot for event reminders')
		.addStringOption(option =>
			option.setName('name')
				.setDescription('Name of the event series')
				.setRequired(true))
		.addStringOption(option =>
			option.setName('description')
				.setDescription('Description of the event seies')
				.setRequired(true))
		.addUserOption(option =>
			option.setName('organizer')
				.setDescription('The user in charge of organizing the event series.')
				.setRequired(true)),
	async execute(interaction) {
		let seriesName = interaction.options.getString('name');
		let description = interaction.options.getString('description');
		let organizer = interaction.options.getMember('organizer');
		let guild = interaction.guild;

		// Does this user have permission to add an event series?
		let permissionErrorMessage = await modPermissionCheck(interaction);
		if (permissionErrorMessage) {
			await interaction.reply({
				content: permissionErrorMessage, ephemeral: true
			});
			return;
		}

		// Load the data from file
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
				return;
			}
		};

		let newSeries = {
			name: seriesName,
			description: description,
			organizers: [
				{
					username: organizer.displayName,
					id: organizer.id
				}]
		}

		serverData.eventSeries.push(newSeries);

		fs.writeFileSync(filename, JSON.stringify(dataFile), () => { });

		// reply to the command - BECKYTODO - do better
		await interaction.reply({
			embeds: [new EmbedBuilder()
				.setDescription("Event Added!")]
		});
	},
};

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { formatEventDate } = require('../showEventsHelper');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('show-event-details')
		.setDescription('Show upcoming server events')
		.addStringOption(option =>
			option.setName('series')
				.setDescription('Name of the series')
				.setRequired(true))
		.addStringOption(option =>
			option.setName('event')
				.setDescription('Name of the event')
				.setRequired(true)),
	async execute(interaction) {

		let seriesName = interaction.options.getString('series');
		let eventName = interaction.options.getString('event');
		let guild = interaction.guild;

		// Load the data from file
		let filename = "winner-and-event-data.json";
		let dataFile = require("../" + filename);
		let serverData = dataFile[guild.id];

		// Find the series
		let series = serverData.eventSeries.find(series => series.name == seriesName);
		if (!series) {
			await interaction.reply({
				embeds: [new EmbedBuilder()
					.setTitle(seriesName + " does not exist!")
				],
				ephemeral: true
			});
			return;
		}

		// Find the event
		let event = series.events.find(event => event.name == eventName);
		if (!event) {
			await interaction.reply({
				embeds: [new EmbedBuilder()
					.setTitle(eventName + " does not exist in " + seriesName)
				],
				ephemeral: true
			});
			return;
		}

		let replyString = "*Organized by " + series.organizers[0].username + "";
		if (series.eventThread) {
			replyString += " in <#" + series.eventThread + ">"
		}
		replyString += "*\n\n" + formatEventDate(event);
		if (event.description) {
			replyString += "\n\n" + event.description
		}

		await interaction.reply({
			embeds: [new EmbedBuilder()
				.setTitle(event.name + " in " + series.name)
				.setDescription(replyString)
				.setColor(0xff)]
		});
	}
}

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getEventsDisplyString } = require('../showEventsHelper');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('upcoming-events')
		.setDescription('Show upcoming server events'),
	async execute(interaction) {

		let guild = interaction.guild;

		// Load the data from file
		let filename = "winner-and-event-data.json";
		let dataFile = require("../" + filename);
		if (dataFile[guild.id] == null) {
			dataFile[guild.id] = {};
		}
		let serverData = dataFile[guild.id];

		let description = await getEventsDisplyString(guild, serverData.eventSeries, false, true);
		if (description) {

			await interaction.reply({
				embeds: [new EmbedBuilder()
					.setTitle("Upcoming Events ")
					.setDescription(description)
					.setColor(0xff)
					.setFooter({ text: "(Use /show-event-details for more information on an event)" })]
			});
		}
		else {
			await interaction.reply({
				embeds: [new EmbedBuilder()
					.setTitle("No Upcoming Events")
					.setColor(0xff)]
			})
		}
	}
}

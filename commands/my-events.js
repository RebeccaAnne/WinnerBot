const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getEventsDisplyString } = require('../showEventsHelper');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('my-events')
		.setDescription('Show series and events organized by you'),
	async execute(interaction) {

		console.log("my-events");

		let guild = interaction.guild;

		// Load the data from file
		let filename = "winner-and-event-data.json";
		let dataFile = require("../" + filename);
		if (dataFile[guild.id] == null) {
			dataFile[guild.id] = {};
		}

		let serverData = dataFile[guild.id];

		// Filter the events to only those organized by this caller
		let myEventSeries = serverData.eventSeries.filter(series => {
			for (const organizer of series.organizers) {
				if (interaction.user.id == organizer.id) { return true; }
			}
			return false;
		})

		if (myEventSeries.length == 0) {
			await interaction.reply({
				embeds: [new EmbedBuilder()
					.setTitle("You are not the organizer of any events")],
				ephemeral: true
			})
		}
		else {
			let description = await getEventsDisplyString(guild, myEventSeries, true);

			await interaction.reply({
				embeds: [new EmbedBuilder()
					.setTitle("Your event series")
					.setDescription(description)],
				ephemeral: true
			});
		}
	}
};

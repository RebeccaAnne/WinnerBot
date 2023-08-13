const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const dayjs = require('dayjs');

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

		let eventListString = "";
		for (let eventSeries of serverData.eventSeries) {

			if (eventSeries.events.length > 0) {
				eventListString += "**" + eventSeries.name + ":**\n";
				eventListString += "*(organizer: " + eventSeries.organizers[0].username + ")*\n";

				eventSeries.events.sort((a, b) => {
					if (a.Date.isBefore(b.Date)) { return -1; }
					else if (b.Date.isBefore(a.Date)) { return 1; }
					else { return 0; }
				});

				// Show the first three upcoming events for this series
				for (let i = 0; i < 3 && i < eventSeries.events.length; i++) {

					// Format the date
					let displayDate = "";
					let eventDayJs = dayjs(eventSeries.events[i].date);

					if (eventSeries.events[i].allDayEvent) {
						// For all day events display the fixed calendar date
						displayDate = eventDayJs.format("MMMM DD, YYYY");
					}
					else {
						// For non-all day events, format as a hammertime
						displayDate = "<t:" + eventDayJs.unix() + ":f>";
					}

					// Add the formatted date and event title to the string
					eventListString += displayDate + ": " + eventSeries.events[i].name + "\n";
				}

				// If there are more than 3 events, display the count of non-displayed events
				if (eventSeries.events.length > 3) {
					eventListString += "*(" + (eventSeries.events.length - 3) + "more scheduled events)*"
				}
			}
			eventListString += "\n";
		}

		await interaction.reply({
			embeds: [new EmbedBuilder()
				.setTitle("Upcoming Events:")
				.setDescription(eventListString)
				.setColor(0xff)]
		});
	},

};

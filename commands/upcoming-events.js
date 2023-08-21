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

		// Sort the events of each series
		let eventsExist = false;
		for (let eventSeries of serverData.eventSeries) {
			eventsExist |= eventSeries.events.length > 0;
			eventSeries.events.sort((a, b) => {
				let aDate = dayjs(a.date);
				let bDate = dayjs(b.date);

				if (aDate.isBefore(bDate)) { return -1; }
				else if (bDate.isBefore(aDate)) { return 1; }
				else { return 0; }
			});
		}

		if (!eventsExist) {
			await interaction.reply({
				embeds: [new EmbedBuilder()
					.setTitle("No Upcoming Events")
					.setColor(0xff)]

			})
			return;
		}

		// Sort the series by ealiest event
		serverData.eventSeries.sort((a, b) => {

			// If one of the series doesn't have any events, sort it first
			if (a.events.length == 0 || b.events.length == 0) {
				if (b.events.length == a.events.length) { return 0; }
				else if (a.events.length == 0) { return -1; }
				else { return 1; }
			}

			let aDate = dayjs(a.events[0].date);
			let bDate = dayjs(b.events[0].date);

			if (aDate.isBefore(bDate)) { return -1; }
			else if (bDate.isBefore(aDate)) { return 1; }
			else { return 0; }
		})

		let eventListString = "";
		for (let eventSeries of serverData.eventSeries) {

			if (eventSeries.events.length > 0) {
				eventListString += "**" + eventSeries.name + ":**\n";
				eventListString += "*(organizer: " + eventSeries.organizers[0].username + ")*\n";

				// Show the first three upcoming events for this series
				for (let i = 0; i < 3 && i < eventSeries.events.length; i++) {

					// Format the date
					let displayDate = "";
					let eventDayJs = dayjs(eventSeries.events[i].date);

					if (eventSeries.events[i].allDayEvent) {
						// For all day events display the fixed calendar date
						displayDate = eventDayJs.format("MMMM D, YYYY");
					}
					else {
						// For non-all day events, format as a hammertime
						displayDate = "<t:" + eventDayJs.unix() + ":f>";
					}

					// Add the formatted date and event title to the string
					eventListString += "- " + displayDate + ": " + eventSeries.events[i].name + "\n";
				}

				// If there are more than 3 events, display the count of non-displayed events
				if (eventSeries.events.length > 3) {
					eventListString += "*(" + (eventSeries.events.length - 3) + " more scheduled event(s))*\n"
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

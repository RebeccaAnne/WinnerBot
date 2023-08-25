const { SlashCommandBuilder, EmbedBuilder, GuildScheduledEventManager } = require('discord.js');
const { formatEventDate } = require('../showEventsHelper');
const dayjs = require('dayjs');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('show-event-details')
		.setDescription('Show upcoming server events')
		.addStringOption(option =>
			option.setName('series')
				.setDescription('Name of the series')
				.setRequired(true)
				.setAutocomplete(true))
		.addStringOption(option =>
			option.setName('event')
				.setDescription('Name of the event')
				.setRequired(true)
				.setAutocomplete(true)),
	async execute(interaction) {

		let seriesName = interaction.options.getString('series');
		let eventName = interaction.options.getString('event');
		let guild = interaction.guild;

		console.log("eventName " + eventName)


		let seriesExists;
		let eventExists;
		let dateString;
		let organizerName;
		let thread;
		let description;

		if (seriesName === "Voice Events") {
			seriesExists = true;

			const eventManager = new GuildScheduledEventManager(interaction.guild);
			let event = await eventManager.fetch(eventName);

			if (event) {
				eventExists = true;
				dateString = "<t:" + dayjs(event.scheduledStartAt).unix() + ":f>\n";
				organizerName = event.creator.username;
				description = event.description;
				eventName = event.name;
			}
		}

		else {
			// Load the data from file
			let filename = "winner-and-event-data.json";
			let dataFile = require("../" + filename);
			let serverData = dataFile[guild.id];

			// Find the series
			let series = serverData.eventSeries.find(series => series.name.toUpperCase() == seriesName.toUpperCase());
			if (series) {
				seriesExists = true;

				// Find the event
				let event = series.events.find(event => event.name.toUpperCase() == eventName.toUpperCase());
				if (event) {
					eventExists = true;
					dateString = formatEventDate(event);
					organizerName = series.organizers[0].username;
					description = event.description;
					thread = series.eventThread;


				}
			}
		}

		if (!seriesExists) {
			await interaction.reply({
				embeds: [new EmbedBuilder()
					.setTitle(seriesName + " does not exist!")
				],
				ephemeral: true
			});
			return;
		}
		if (!eventExists) {
			await interaction.reply({
				embeds: [new EmbedBuilder()
					.setTitle(eventName + " does not exist in " + seriesName)
				],
				ephemeral: true
			});
			return;
		}

		let replyString = "*Organized by " + organizerName + "";
		if (thread) {
			replyString += " in <#" + thread + ">"
		}
		replyString += "*\n\n" + dateString;
		if (description) {
			replyString += "\n\n" + description
		}

		await interaction.reply({
			embeds: [new EmbedBuilder()
				.setTitle(eventName + " in " + seriesName)
				.setDescription(replyString)
				.setColor(0xff)]
		});


	},

	async autocomplete(interaction) {
		handleSeriesAutoComplete(interaction);
	}
}

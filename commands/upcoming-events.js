const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getEventsDisplyString, getEventsDisplyStringForSeries, getEventsDisplyStringForVoice } = require('../showEventsHelper');
const { normalizeString } = require('../utils');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('upcoming-events')
		.setDescription('Show upcoming server events')
		.addStringOption(option =>
			option.setName('series')
				.setDescription('Optional series name to show events only from a single series')
				.setAutocomplete(true)),
	async execute(interaction) {

		let seriesName = interaction.options.getString('series');
		let guild = interaction.guild;

		// Load the data from file
		let filename = "winner-and-event-data.json";
		let dataFile = require("../" + filename);
		if (dataFile[guild.id] == null) {
			dataFile[guild.id] = {};
		}
		let serverData = dataFile[guild.id];

		let title = "Upcoming Events ";
		let description = "";
		if (seriesName) {

			if (normalizeString(seriesName) == normalizeString("Voice Events")) {
				await interaction.deferReply();
				description = await getEventsDisplyStringForVoice(guild);
				title = "Upcoming Voice Events";
			}
			else {
				// If they want events from a particular series, get that series
				let series = serverData.eventSeries.find(series => normalizeString(series.name) == normalizeString(seriesName));
				if (!series) {
					await interaction.reply({
						embeds: [new EmbedBuilder()
							.setTitle(seriesName + " does not exist!")
						],
						ephemeral: true
					});
					return;
				}

				// Get the string for this series (max 5 events)
				await interaction.deferReply();
				description = getEventsDisplyStringForSeries(series, false, 5);
				title += "in " + seriesName;
			}
		}
		else {
			// Get the events string for all series in this server
			await interaction.deferReply();
			description = await getEventsDisplyString(guild, serverData.eventSeries, false, true);
		}

		if (description) {

			await interaction.editReply({
				embeds: [new EmbedBuilder()
					.setTitle(title)
					.setDescription(description)
					.setColor(0xff)
					.setFooter({ text: "(Use /show-event-details for more information on an event)" })]
			});
		}
		else {
			title = "No " + title;
			await interaction.editReply({
				embeds: [new EmbedBuilder()
					.setTitle(title)
					.setColor(0xff)]
			})
		}
	},

	async autocomplete(interaction) {
		handleSeriesAutoComplete(interaction);
	}

}

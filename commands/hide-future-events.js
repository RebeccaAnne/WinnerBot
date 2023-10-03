var fs = require("fs");
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const dayjs = require('dayjs');
const { isMemberModJs, tryParseHammerTime, tryParseYYYYMMDD } = require('../utils');
const { formatEventDate } = require("../showEventsHelper");

module.exports = {
	data: new SlashCommandBuilder()
		.setName('hide-future-events')
		.setDescription('Set whether to hide events that have not yet started from appearing in /upcoming-events.')
		.addStringOption(option =>
			option.setName('series')
				.setDescription('Name of the series to modify')
				.setRequired(true)
				.setAutocomplete(true))
		.addBooleanOption(option =>
			option.setName('hide-future-events')
				.setRequired(true)
				.setDescription('Set to true to hide events that have not yet started')),
	async execute(interaction) {
		let seriesName = interaction.options.getString('series');
		let hideFutureEvents = interaction.options.getBoolean("hide-future-events");

		let guild = interaction.guild;
		let serverConfig = require("../data/server-config-" + guild.id + ".json");

		if (seriesName == "Voice Events") {
			await interaction.reply({
				content: "hide-future-events not supported for voice events",
				ephemeral: true
			});
			return false;
		}

		// Load the data from file
		let newEvent = {};
		let series = {};
		let succeeded = await getMutex().runExclusive(async () => {

			let filename = "winner-and-event-data.json";
			let dataFile = require("../" + filename);
			if (dataFile[guild.id] == null) {
				dataFile[guild.id] = {};
			}

			let serverData = dataFile[guild.id];

			// Find the series to add the event to
			series = serverData.eventSeries.find(series => series.name.toUpperCase() == seriesName.toUpperCase());
			if (!series) {
				await interaction.reply({
					content: seriesName + " doesn't exist! Contact a mod or junior-secretary to create a new event series.", ephemeral: true
				});
				return false;
			}

			// To edit a series, the caller must either be an organzier or a mod/js
			let callingMember = await guild.members.fetch(interaction.user.id);
			if (!series.organizers.find(organizer => (organizer.id == callingMember.id)) &&
				!isMemberModJs(serverConfig, callingMember)) {

				// Reply with the organizers to contact to update this series
				let organizerString = "";
				for (let i = 0; i < series.organizers.length; i++) {
					organizerString += getListSeparator(i, series.organizers.length);
					organizerString += series.organizers[i].username;
				}

				await interaction.reply({
					content: "You don't have permission to add events to this series. Contact " + organizerString + " to add a new event.", ephemeral: true
				});
				return false;
			}

			series.hideFutureEvents = hideFutureEvents;
			fs.writeFileSync(filename, JSON.stringify(dataFile), () => { });
			return true;
		});

		if (!succeeded) { return; }

		let description = series.name +
			(hideFutureEvents ? " will **not** " : " **will** ") +
			" show events that haven't begun in /upcoming-events"

		await interaction.reply({
			embeds: [new EmbedBuilder()
				.setTitle("Success!")
				.setDescription(description)],
			ephemeral: true
		});
	},

	async autocomplete(interaction) {
		handleSeriesAutoComplete(interaction);
	}
};

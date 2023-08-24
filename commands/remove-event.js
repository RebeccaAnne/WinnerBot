var fs = require("fs");
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('remove-event')
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

		let succeeded = await getMutex().runExclusive(async () => {

			// Load the data from file
			let filename = "winner-and-event-data.json";
			let dataFile = require("../" + filename);
			let serverData = dataFile[guild.id];

			// Find the event
			let series = serverData.eventSeries.find(series => series.name == seriesName);
			if (!series) {
				await interaction.reply({
					embeds: [new EmbedBuilder()
						.setTitle(seriesName + " does not exist!")
					],
					ephemeral: true
				});
				return false;
			}

			// To add events to the series, the caller must either be an organzier or a mod/js
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
					content: "You don't have permission to remove events to this series. Contact " + organizerString + " to remove an event.", ephemeral: true
				});
				return false;
			}

			let eventIndex = series.events.findIndex(event => event.name == eventName);
			if (eventIndex == -1) {
				await interaction.reply({
					embeds: [new EmbedBuilder()
						.setTitle(eventName + " does not exist in " + seriesName)
					],
					ephemeral: true
				});
				return false;
			}

			series.events.splice(eventIndex, 1);
			fs.writeFileSync(filename, JSON.stringify(dataFile), () => { });
			return true;
		});
		if (!succeeded) { return; }

		await interaction.reply({
			embeds: [new EmbedBuilder()
				.setTitle(eventName + " successfully removed from " + seriesName)],
			ephemeral: true
		});
	}
}

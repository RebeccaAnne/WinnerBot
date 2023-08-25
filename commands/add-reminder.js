var fs = require("fs");
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const dayjs = require('dayjs');
const { isMemberModJs, tryParseHammerTime, tryParseYYYYMMDD } = require('../utils');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('add-reminder')
		.setDescription('Add a reminder to an event')
		.addStringOption(option =>
			option.setName('series')
				.setDescription('Name of the series')
				.setRequired(true)
				.setAutocomplete(true))
		.addStringOption(option =>
			option.setName('event')
				.setDescription('Name of the event')
				.setRequired(true)
				.setAutocomplete(true))
		.addStringOption(option =>
			option.setName('reminder-date-time')
				.setDescription('When the bot should send a reminder for this event (hammertime)')
				.setRequired(true))
		.addChannelOption(option =>
			option.setName('reminder-channel')
				.setDescription('What channel the bot should send a reminder to (defaults to current channel)')),
	async execute(interaction) {
		let seriesName = interaction.options.getString('series');
		let eventName = interaction.options.getString('event');
		let reminderDateTime = interaction.options.getString('reminder-date-time');
		let guild = interaction.guild;
		let serverConfig = require("../data/server-config-" + guild.id + ".json");

		let reminderChannelId;
		let reminderChannelParameter = interaction.options.getChannel('reminder-channel');
		if (reminderChannelParameter) {
			reminderChannelId = reminderChannelParameter.id;
		}
		else {
			reminderChannelId = interaction.channelId;
		}

		let replyString = ""
		let event = {};
		let succeeded = await getMutex().runExclusive(async () => {

			// Load the data from file
			let filename = "winner-and-event-data.json";
			let dataFile = require("../" + filename);
			if (dataFile[guild.id] == null) {
				dataFile[guild.id] = {};
			}

			let serverData = dataFile[guild.id];

			// Find the series 
			let series = serverData.eventSeries.find(series => series.name.toUpperCase() == seriesName.toUpperCase());
			if (!series) {
				await interaction.reply({
					content: seriesName + " doesn't exist! Contact a mod or junior-secretary to create a new event series.", ephemeral: true
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
					organizerString += organizer.username;
				}

				await interaction.reply({
					content: "Contact " + organizerString + " to edit this series", ephemeral: true
				});
				return false;
			}

			// Find the event
			event = series.events.find(event => event.name.toUpperCase() == eventName.toUpperCase());
			if (!event) {
				await interaction.reply({
					content: eventName + " doesn't exist! Use add-event to create an event", ephemeral: true
				});
				return false;
			}

			let parsedReminderDateTime = tryParseHammerTime(reminderDateTime);
			if (!parsedReminderDateTime) {
				await interaction.reply({
					content: "reminder-date-time must be a valid HammerTime (see https://hammertime.cyou/)", ephemeral: true
				});
				return false;
			}

			replyString =
				"**Reminder time**: " + "<t:" + dayjs(parsedReminderDateTime).unix() + ":f>" +
				"\n**Reminder channel**: <#" + reminderChannelId + ">";

			let reminder = {
				date: parsedReminderDateTime,
				channel: reminderChannelId
			};

			await scheduleReminder(serverConfig, guild, series, event, reminder);
			event.reminders.push(reminder);
			fs.writeFileSync(filename, JSON.stringify(dataFile), () => { });
			return true;
		});
		if (!succeeded) { return; }

		console.log("Reminder added to " + event.name + " in " + seriesName);

		await interaction.reply({
			embeds: [new EmbedBuilder()
				.setDescription(replyString)
				.setTitle("Reminder Added for " + event.name)],
			ephemeral: true
		});
	},

	async autocomplete(interaction) {
		handleSeriesAutoComplete(interaction);
	}
};

var fs = require("fs");
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const dayjs = require('dayjs');
const { isMemberModJs, tryParseHammerTime, tryParseYYYYMMDD } = require('../utils');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('add-event')
		.setDescription('Add an event to an existing series')
		.addStringOption(option =>
			option.setName('series')
				.setDescription('Name of the series to add the event to')
				.setRequired(true))
		.addStringOption(option =>
			option.setName('name')
				.setDescription('Name of the event')
				.setRequired(true))
		.addStringOption(option =>
			option.setName('event-date-time')
				.setDescription('When the event takes place (hammertime for date/time, YYYY-MM-DD for calendar day)')
				.setRequired(true))
		.addStringOption(option =>
			option.setName('reminder-date-time')
				.setDescription('When the bot should send a reminder for this event (hammertime)'))
		.addChannelOption(option =>
			option.setName('reminder-channel')
				.setDescription('What channel the bot should send a reminder to')),
	async execute(interaction) {
		let seriesName = interaction.options.getString('series');
		let eventName = interaction.options.getString('name');
		let eventDateTime = interaction.options.getString('event-date-time');
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

		// Load the data from file
		let filename = "winner-and-event-data.json";
		let dataFile = require("../" + filename);
		if (dataFile[guild.id] == null) {
			dataFile[guild.id] = {};
		}

		let serverData = dataFile[guild.id];

		// Find the series to add the event to
		let series = serverData.eventSeries.find(series => series.name == seriesName);
		if (!series) {
			await interaction.reply({
				content: seriesName + " doesn't exist! Contact a mod or junior-secretary to create a new event series.", ephemeral: true
			});
			return;
		}

		if (series.events.find(event => event.name == eventName)) {
			await interaction.reply({
				content: eventName + " already exists in the " + seriesName + " series!", ephemeral: true
			});
			return;
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
				content: "You don't have permission to add events to this series. Contact " + organizerString + " to add a new event.", ephemeral: true
			});
			return;
		}

		let newEvent = { name: eventName, reminders: [] }

		// Get the event date
		newEvent.date = tryParseHammerTime(eventDateTime);
		if (!newEvent.date) {
			newEvent.date = tryParseYYYYMMDD(eventDateTime);
			if (!newEvent.date) {
				await interaction.reply({
					content: "event-date-time must be of the format YYYY-MM-DD or a valid HammerTime (see https://hammertime.cyou/)", ephemeral: true
				});
				return;
			}

			// if this is a YYYY-MM-DD date mark it as all day
			newEvent.allDayEvent = true;
		}

		if (reminderDateTime) {
			let parsedReminderDateTime = tryParseHammerTime(reminderDateTime);
			if (!parsedReminderDateTime) {
				await interaction.reply({
					content: "Event creation failed! reminder-date-time, if present, must be a valid HammerTime (see https://hammertime.cyou/)", ephemeral: true
				});
				return;
			}

			reminder = { date: parsedReminderDateTime, channel: reminderChannelId };
			newEvent.reminders.push(reminder);
		}
		else if (reminderChannelParameter) {
			// If they passed in a reminder channel with no date, throw an error
			await interaction.reply({
				content: "Event creation failed! reminder-channel specified with no reminder-date-time.", ephemeral: true
			});
			return;
		}

		await scheduleEventTimers(serverConfig, guild, series, newEvent);

		series.events.push(newEvent);
		fs.writeFileSync(filename, JSON.stringify(dataFile), () => { });

		let dateString = "";
		if (newEvent.allDayEvent) {
			// For all day events display the fixed calendar date
			dateString += dayjs(newEvent.date).format("MMMM D, YYYY");
		}
		else {
			// For non-all day events, format as a hammertime
			dateString += "<t:" + dayjs(newEvent.date).unix() + ":f>";
		}

		await interaction.reply({
			embeds: [new EmbedBuilder()
				.setDescription(dateString)
				.setTitle(newEvent.name + " added to " + series.name)]
		});

		// Send a follow up with the reminder if present
		if (reminderDateTime) {
			let reminderString =
				"**Reminder time**: " + "<t:" + dayjs(newEvent.reminders[0].date).unix() + ":f>" +
				"\n**Reminder channel**: <#" + newEvent.reminders[0].channel + ">";

			await interaction.followUp({
				embeds: [new EmbedBuilder()
					.setDescription(reminderString)
					.setTitle("Reminder Added for " + newEvent.name)],
				ephemeral: true
			});
		}
	},
};

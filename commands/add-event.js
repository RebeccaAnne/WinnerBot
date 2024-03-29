var fs = require("fs");
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const dayjs = require('dayjs');
const { isMemberModJs, tryParseHammerTime, tryParseYYYYMMDD } = require('../utils');
const { formatEventDate } = require("../showEventsHelper");
const { handleSeriesAutoComplete } = require("../autoCompleteHelper");

module.exports = {
	data: new SlashCommandBuilder()
		.setName('add-event')
		.setDescription('Add an event to an existing series')
		.addStringOption(option =>
			option.setName('series')
				.setDescription('Name of the series to add the event to')
				.setRequired(true)
				.setAutocomplete(true))
		.addStringOption(option =>
			option.setName('name')
				.setDescription('Name of the event')
				.setRequired(true))
		.addStringOption(option =>
			option.setName('event-date-time')
				.setDescription('When the event takes place (hammertime for date/time, YYYY-MM-DD for calendar day)')
				.setRequired(true))
		.addStringOption(option =>
			option.setName('description')
				.setDescription('Description of the event'))
		.addNumberOption(option =>
			option.setName('duration-in-hours')
				.setDescription('How long the event lasts. Events with a time but no duration will stay on /upcoming-events for 1 hr.'))
		.addBooleanOption(option =>
			option.setName('announce-event')
				.setDescription('Set to true to show an event creation announcement in this channel'))
		.addStringOption(option =>
			option.setName('reminder-date-time')
				.setDescription('When the bot should send a reminder for this event (hammertime)'))
		.addChannelOption(option =>
			option.setName('reminder-channel')
				.setDescription('What channel the bot should send a reminder to')),
	async execute(interaction) {
		let seriesName = interaction.options.getString('series');
		let eventName = interaction.options.getString('name');
		let description = interaction.options.getString('description');
		let eventDateTime = interaction.options.getString('event-date-time');
		let reminderDateTime = interaction.options.getString('reminder-date-time');
		let announceEvent = interaction.options.getBoolean("announce-event");
		let durationInHours = interaction.options.getNumber("duration-in-hours");

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

		if (seriesName == "Voice Events") {
			await interaction.reply({
				content: "add-event not supported for voice events",
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

			if (series.events.find(event => event.name == eventName)) {
				await interaction.reply({
					content: eventName + " already exists in the " + series.name + " series!", ephemeral: true
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
					content: "You don't have permission to add events to this series. Contact " + organizerString + " to add a new event.", ephemeral: true
				});
				return false;
			}

			newEvent = {
				name: eventName,
				reminders: []
			}

			if (description) {
				newEvent.description = description;
			}

			// Get the event date
			newEvent.date = tryParseHammerTime(eventDateTime);
			if (!newEvent.date) {
				newEvent.date = tryParseYYYYMMDD(eventDateTime);
				if (!newEvent.date) {
					await interaction.reply({
						content: "event-date-time must be of the format YYYY-MM-DD or a valid HammerTime (see https://hammertime.cyou/)", ephemeral: true
					});
					return false;
				}

				if (durationInHours) {
					await interaction.reply({
						content: "durationInHours is not valid for a YYYY-MM-DD. To control event duration please pass a  HammerTime (see https://hammertime.cyou/)", ephemeral: true
					});
					return false;

				}
				// if this is a YYYY-MM-DD date mark it as all day
				newEvent.allDayEvent = true;
			}

			if (durationInHours) {
				newEvent.durationInHours = durationInHours;
			}

			if (reminderDateTime) {
				let parsedReminderDateTime = tryParseHammerTime(reminderDateTime);
				if (!parsedReminderDateTime) {
					await interaction.reply({
						content: "Event creation failed! reminder-date-time, if present, must be a valid HammerTime (see https://hammertime.cyou/)", ephemeral: true
					});
					return false;
				}

				reminder = { date: parsedReminderDateTime, channel: reminderChannelId };
				newEvent.reminders.push(reminder);
			}
			else if (reminderChannelParameter) {
				// If they passed in a reminder channel with no date, throw an error
				await interaction.reply({
					content: "Event creation failed! reminder-channel specified with no reminder-date-time.", ephemeral: true
				});
				return false;
			}

			await scheduleEventTimers(serverConfig, guild, series, newEvent);

			series.events.push(newEvent);
			fs.writeFileSync(filename, JSON.stringify(dataFile), () => { });
			return true;
		});

		if (!succeeded) { return; }

		let replyString = formatEventDate(newEvent);
		if (description) {
			replyString += "\n\n" + description;
		}

		let reminderString = "";
		if (reminderDateTime) {

			reminderString =
				"**Reminder**: " + "<t:" + dayjs(newEvent.reminders[0].date).unix() + ":f>" +
				"\n**Reminder channel**: <#" + newEvent.reminders[0].channel + ">";
		}

		console.log("Event " + newEvent.name + " added to " + series.name);

		if (!announceEvent) {

			// If we're not announcing the event, put all information in a single ephemeral reply 
			// for the creator
			await interaction.reply({
				embeds: [new EmbedBuilder()
					.setDescription(replyString + "\n\n" + reminderString)
					.setTitle(newEvent.name + " added to " + series.name)],
				ephemeral: true
			});
		}
		else {

			// If we are announcing the event, send a reply that goes to everyone with just the reply string,
			// and then an ephemeral follow up with reminder information as needed
			await interaction.reply({
				embeds: [new EmbedBuilder()
					.setDescription(replyString)
					.setTitle(newEvent.name + " added to " + series.name)
					.setColor(0xff)]
			});

			if (reminderDateTime) {
				await interaction.followUp({
					embeds: [new EmbedBuilder()
						.setDescription(reminderString)
						.setTitle("Reminder Added for " + newEvent.name)],
					ephemeral: true
				});
			}
		}
	},

	async autocomplete(interaction) {
		handleSeriesAutoComplete(interaction);
	}

};

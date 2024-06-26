var fs = require("fs");
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const dayjs = require('dayjs');
const { scheduleExpirationCheck } = require('../timers');
const { formatWinnerString, formatWinnerReason, getOrdinal, tryParseHammerTime } = require('../utils');
const { addWinners } = require('../addWinnersHelper');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('add-winner')
		.setDescription('Adds a new Winner of the Discord')
		.addUserOption(option =>
			option.setName('winner')
				.setDescription('The user who won the discord')
				.setRequired(true))
		.addStringOption(option =>
			option.setName('reason')
				.setDescription('The reason for winning')
				.setRequired(true))
		.addStringOption(option =>
			option.setName('link')
				.setDescription('Link to the winning work. (ao3, message link, etc.)')
				.setRequired(true))
		.addStringOption(option =>
			option.setName('work-type')
				.setDescription('What type of fanwork this is. Choose from auto-complete options or type a custom work type.')
				.setAutocomplete(true)
				.setRequired(true))
		.addStringOption(option =>
			option.setName('win-date-time')
				.setDescription('Optional date/time (hammertime) for this win. Defaults to now.')),
	async execute(interaction) {
		let winner = interaction.options.getMember('winner');
		let reason = interaction.options.getString('reason');
		let link = interaction.options.getString('link');
		let workType = interaction.options.getString('work-type');
		let dateTimeString = interaction.options.getString('win-date-time');

		let guild = interaction.guild;
		let serverConfig = require("../data/server-config-" + guild.id + ".json");

		let permissionErrorMessage = await modjsPermissionChannelCheck(interaction);
		if (permissionErrorMessage) {
			await interaction.reply({
				content: permissionErrorMessage, ephemeral: true
			});
			return;
		}

		let dateTime = null;
		if (dateTimeString) {
			dateTime = tryParseHammerTime(dateTimeString);
			if (!dateTime) {
				await interaction.reply({
					content: "Winner not added!\nwin-date-time, if present, must be a valid HammerTime (see https://hammertime.cyou/)",
					ephemeral: true
				});
				return;
			}
			else {
				let dateCutoff = dayjs().subtract(7, 'day');
				if (dayjs(dateTime).isBefore(dateCutoff)) {
					await interaction.reply({
						content: "Winner not added!\nThis win has already expired",
						ephemeral: true
					});
					return;
				}
			}
		}

		if (workType.toUpperCase() == "EMOJI") {
			// If the type is emoji, we won't be adding a workType emoji to the display. Confirm that the caller has 
			// included the new emoji in the reason. The regex will look for a custom emoji string of the form:
			// <:customEmojiName:1161416674021486652>
			const regex = /<a?:\w+:\d+>/g;
			if (!reason.match(regex)) {
				console.log("Bad emoji: " + reason);
				await interaction.reply({
					content: "For Emoji win types please include the emoji in the win reason.",
					ephemeral: true
				});
				return;
			}
		}

		// Defer the reply to prevent timeouts, because this code has a lot of things to do if we hit a terror.
		await interaction.deferReply();

		let replyString = "**Winner added:**\n";
		replyString += await addWinners(guild, serverConfig, [winner], reason, link, workType, dateTime ? dayjs(dateTime) : null);

		// reply to the command
		await interaction.editReply({
			embeds: [new EmbedBuilder()
				.setDescription(replyString)]
		});
	},

	async autocomplete(interaction) {
		handleWorkTypeAutoComplete(interaction);
	}
};

var fs = require("fs");
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const dayjs = require('dayjs');
const { scheduleExpirationCheck } = require('../timers');
const { formatWinnerString, formatWinnerReason, getOrdinal } = require('../utils');
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
				.setRequired(true)),
	async execute(interaction) {
		let winner = interaction.options.getMember('winner');
		let reason = interaction.options.getString('reason');
		let link = interaction.options.getString('link');

		let guild = interaction.guild;
		let serverConfig = require("../data/server-config-" + guild.id + ".json");

		let permissionErrorMessage = await modjsPermissionChannelCheck(interaction);
		if (permissionErrorMessage) {
			await interaction.reply({
				content: permissionErrorMessage, ephemeral: true
			});
			return;
		}

		// There was an unknown interaction crash in this code after a large terror. I think possibly the issue is
		// that with so many things to do we actually reach the timeout? Although 3 seconds should be plenty of 
		// time... Anyway, deferring reply, just in case. 
		await interaction.deferReply();

		let replyString = "**Winner added:**\n";
		replyString += await addWinners(guild, serverConfig, [winner], reason, link);

		// reply to the command
		await interaction.editReply({
			embeds: [new EmbedBuilder()
				.setDescription(replyString)]
		});
	},
};

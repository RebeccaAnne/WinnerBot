var fs = require("fs");
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const dayjs = require('dayjs');
const { scheduleExpirationCheck } = require('../expire-schedule');
const { formatWinnerString, formatWinnerReason, getOrdinal } = require('../utils');


module.exports = {
	data: new SlashCommandBuilder()
		.setName('add-bot-event')
		.setDescription('Add an event to the bot for event reminders')
		.addStringOption(option =>
			option.setName('name')
				.setDescription('Name of the event')
				.setRequired(true))
		.addUserOption(option =>
			option.setName('organizer')
				.setDescription('The user in charge of organizing the event.')
				.setRequired(true)),
	async execute(interaction) {
		let eventName = interaction.options.getString('name');
		let winner = interaction.options.getMember('winner');
		let guild = interaction.guild;

		let serverConfig = require("../data/server-config-" + guild.id + ".json");

		// Does this user have permission to add an event?
		let permissionErrorMessage = await modPermissionCheck(interaction);
		if (permissionErrorMessage) {
			await interaction.reply({
				content: permissionErrorMessage, ephemeral: true
			});
			return;
		}

		// Load the winner array from file
		winnerFilename = "winner-arrays.json";
		let winnerListFile = require("../" + winnerFilename);
		if (winnerListFile[guild.id] == null) {
			winnerListFile[guild.id] = {};
		}

		let winnerList = winnerListFile[guild.id];

		// Get the win object for this user
		let winnerObject = {};
		let winnerExists = false;
		let winnerIndex = 0;
		for (existingWinner of winnerList.winners) {
			if (winner.id == existingWinner.id) {
				winnerObject = existingWinner;
				winnerExists = true;
				break;
			}
			winnerIndex++;
		};

		if (!winnerExists) {
			await interaction.reply({
				content: "This user is not currently a winner of the discord", ephemeral: true
			});
			return;
		}

		winnerObject.wins.pop();

		let replyString = "";
		if (winnerObject.wins.length == 0) {
			await winner.roles.remove(serverConfig.winnerRoleId);
			winnerList.winners.splice(winnerIndex, 1);
			replyString = winner.displayName + " is no longer a winner of the discord";
		}
		else {
			replyString = "Win removed. Current win status for " + winner.displayName + ":\n" + formatWinnerString(winnerObject);
		}

		fs.writeFileSync(winnerFilename, JSON.stringify(winnerListFile), () => { });

		// reply to the command
		await interaction.reply({
			embeds: [new EmbedBuilder()
				.setDescription(replyString)]
		});
	},
};

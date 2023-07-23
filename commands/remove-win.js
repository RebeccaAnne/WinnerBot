var fs = require("fs");
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const dayjs = require('dayjs');
const { scheduleExpirationCheck } = require('../expire-schedule');
const { formatWinnerString, formatWinnerReason, getOrdinal } = require('../utils');


module.exports = {
	data: new SlashCommandBuilder()
		.setName('remove-win')
		.setDescription('Removes the most recent win from a winner. Will revert to an earlier unexpired win if present.')
		.addUserOption(option =>
			option.setName('winner')
				.setDescription('The user to remove a win from')
				.setRequired(true)),
	async execute(interaction) {
		let winner = interaction.options.getMember('winner');
		let guild = interaction.guild;

		let serverConfig = require("../data/server-config-" + guild.id + ".json");

		// Does this user have permission to add winners?
		let callingMember = await guild.members.fetch(interaction.user.id);
		let hasPermission = false;
		serverConfig.modRoles.forEach(modRole => {
			if (callingMember.roles.cache.some(role => role.id === modRole)) {
				hasPermission = true;
			}
		});

		let permissionErrorMessage = await winnerUpdatePermissionCheck(interaction);
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

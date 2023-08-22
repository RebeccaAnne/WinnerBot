var fs = require("fs");
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const dayjs = require('dayjs');
const { formatWinnerString, modjsPermissionChannelCheck } = require('../utils');


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

		// Does this user have permission to edit winners?
		let permissionErrorMessage = await modjsPermissionChannelCheck(interaction);
		if (permissionErrorMessage) {
			await interaction.reply({
				content: permissionErrorMessage, ephemeral: true
			});
			return;
		}

		let replyString = "";
		let succeeded = await getMutex().runExclusive(async () => {

			// Load the winner array from file
			winnerFilename = "winner-and-event-data.json";
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
				return false;
			}

			winnerObject.wins.pop();

			if (winnerObject.wins.length == 0) {
				await winner.roles.remove(serverConfig.winnerRoleId);
				winnerList.winners.splice(winnerIndex, 1);
				replyString = winner.displayName + " is no longer a winner of the discord";
			}
			else {
				replyString = "Win removed. Current win status for " + winner.displayName + ":\n" + formatWinnerString(winnerObject);
			}

			fs.writeFileSync(winnerFilename, JSON.stringify(winnerListFile), () => { });
			return true;
		});
		if (!succeeded) { return; }

		// reply to the command
		await interaction.reply({
			embeds: [new EmbedBuilder()
				.setDescription(replyString)]
		});
	},
};

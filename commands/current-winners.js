var fs = require("fs");
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const dayjs = require('dayjs');
const { } = require("../utils");

module.exports = {
	data: new SlashCommandBuilder()
		.setName('current-winners')
		.setDescription('Displays the current discord winners'),
	async execute(interaction) {

		let guild = interaction.guild;
		let serverConfig = require("../data/server-config-" + guild.id + ".json");

		// Make sure we're in a fanworks channel
		let isAllowedChannel = false;
		for (channel of serverConfig.winnerListAllowed) {
			if (interaction.channelId == channel) {
				isAllowedChannel = true;
				break;
			}
		}

		if (!isAllowedChannel) {
			await interaction.reply({
				content: "Please run this command in the " + serverConfig.winnerListAllowedDescription + " channel", ephemeral: true
			});
			return;
		}

		// Load the winner array from file
		winnerFilename = "winner-and-event-data.json";
		let winnerListFile = require("../" + winnerFilename);
		let winnerList = winnerListFile[guild.id];

		if (winnerList.winners == null || winnerList.winners.length == 0) {
			await interaction.reply({
				embeds: [new EmbedBuilder()
					.setTitle("No current winners!")
					.setFooter({ text: winnerList.currentTerrorThreshold + " needed for Terror of Astandalas" })
					.setColor(0xd81b0e)]
			});
		}
		else {
			winnerList.winners.sort((a, b) => {
				let aDate = dayjs(a.wins[a.wins.length - 1].date);
				let bDate = dayjs(b.wins[b.wins.length - 1].date);

				if (aDate.isBefore(bDate)) { return -1; }
				else if (bDate.isBefore(aDate)) { return 1; }
				else { return 0; }
			});

			let winnerString = "";
			winnerList.winners.forEach(winner => {
				winnerString += formatWinnerString(winner) + "\n";
			});

			// reply to the command
			await interaction.reply({
				embeds: [new EmbedBuilder()
					.setTitle("Current Winners of the Discord")
					.setDescription(winnerString)
					.setFooter({
						text: winnerList.winners.length + " out of " + winnerList.currentTerrorThreshold + " needed for Terror of Astandalas"
					})
					.setColor(0xd81b0e)]
			});
		}
	},
};


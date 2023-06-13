var fs = require("fs");
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const dayjs = require('dayjs');

function getOrdinal(n) {
	let ord = 'th';

	if (n % 10 == 1 && n % 100 != 11) {
		ord = 'st';
	}
	else if (n % 10 == 2 && n % 100 != 12) {
		ord = 'nd';
	}
	else if (n % 10 == 3 && n % 100 != 13) {
		ord = 'rd';
	}

	return ord;
}

module.exports = {
	data: new SlashCommandBuilder()
		.setName('current-winners')
		.setDescription('Displays the current discord winners'),
	async execute(interaction) {

		let guild = interaction.guild;
		let serverConfig = require("../data/server-config-" + guild.id + ".json");

		// Make sure we're in the fanworks channel
		if (interaction.channelId != serverConfig.fanworksChannel) {
			await interaction.reply({
				content: "Please run this command in the " + serverConfig.fanworksChannelDescription + " channel", ephemeral: true
			});
			return;
		}

		// Load the winner array from file
		winnerFilename = "winner-arrays.json";
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
				let aDate = dayjs(a.date);
				let bDate = dayjs(b.date);

				if (aDate.isBefore(bDate)) { return -1; }
				else if (bDate.isBefore(aDate)) { return 1; }
				else { return 0; }
			});

			let winnerString = "";
			winnerList.winners.forEach(winner => {
				let winDate = dayjs(winner.date);
				let displayDate = winDate.format("MMM D") + getOrdinal(winDate.date());
				winnerString += "**" + winner.username + "**: " + winner.reason + ", " + displayDate + "\n";
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


var fs = require("fs");
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const dayjs = require('dayjs');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('current-winners')
		.setDescription('Displays the current discord winners'),
	async execute(interaction) {

		let guild = interaction.guild;

		// Load the winner array from file
		winnerFilename = "winner-arrays.json";
		let winnerList = {}
		try {
			winnerList = require("..\\" + winnerFilename);
		}
		catch (error) {
			console.log("Failed to load serverArrays from file");
		}

		let replyString = "";
		if (winnerList[guild.id + "Winners"] == null || winnerList[guild.id + "Winners"].length == 0) {
			replyString = "No current winners!"
		}
		else {
			winnerList[guild.id + "Winners"].sort((a, b) => {
				let aDate = dayjs(a.date);
				let bDate = dayjs(b.date);

				if (aDate.isBefore(bDate)) { return -1; }
				else if (bDate.isBefore(aDate)) { return 1; }
				else { return 0; }
			});

			replyString = "Current Winners of the Discord:\n"

			winnerList[guild.id + "Winners"].forEach(winner => {
				replyString += "● " + winner.username + ": " + winner.reason + " (" + winner.date + ")" + "\n";
			});

			let serverConfig = require("../data/server-config-" + guild.id + ".json");
			replyString += winnerList[guild.id + "Winners"].length + " out of " + serverConfig.celebrationThreshold + " needed for " + serverConfig.celebrationName;
		}

		// reply to the command
		await interaction.reply(replyString);
	},
};


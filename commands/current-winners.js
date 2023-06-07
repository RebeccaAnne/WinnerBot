var fs = require("fs");
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const dayjs = require('dayjs');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('current-winners')
		.setDescription('Displays the current discord winners'),
	async execute(interaction) {

		let guild = interaction.guild;
		let serverConfig = require("../data/server-config-" + guild.id + ".json");

		// Make sure we're in the fanworks channel
		if (interaction.channel.id != serverConfig.fanworksChannel) {
			await interaction.reply({
				content: "Please run this command in the " + serverConfig.fanworksChannelDescription + " channel", ephemeral: true
			});
			return;
		}

		// Load the winner array from file
		winnerFilename = "winner-arrays.json";
		let winnerList = {}
		try {
			winnerList = require("../" + winnerFilename);
		}
		catch (error) {
			console.log("Failed to load serverArrays from file");
		}

		if (winnerList[guild.id + "-winners"] == null || winnerList[guild.id + "-winners"].length == 0) {
			await interaction.reply({
				embeds: [new EmbedBuilder()
					.setTitle("No current winners!")]
			});
		}
		else {
			winnerList[guild.id + "-winners"].sort((a, b) => {
				let aDate = dayjs(a.date);
				let bDate = dayjs(b.date);

				if (aDate.isBefore(bDate)) { return -1; }
				else if (bDate.isBefore(aDate)) { return 1; }
				else { return 0; }
			});

			let winnerString = "";
			winnerList[guild.id + "-winners"].forEach(winner => {
				winnerString += "**" + winner.username + "**: " + winner.reason + " (" + winner.date + ")" + "\n";
			});

			footer = winnerList[guild.id + "-winners"].length + " out of " + serverConfig.celebrationThreshold + " needed for " + serverConfig.celebrationName;
			// reply to the command
			await interaction.reply({
				embeds: [new EmbedBuilder()
					.setTitle("Current Winners of the Discord")
					.setDescription(winnerString)
					.setFooter({ text: footer })
					.setColor(0xd81b0e)]
			});
		}
	},
};


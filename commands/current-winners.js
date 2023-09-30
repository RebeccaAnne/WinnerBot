var fs = require("fs");
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const dayjs = require('dayjs');
const { } = require("../utils");
const { format } = require("path");

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
					.setFooter({ text: winnerList.currentTerrorThreshold + " winners needed for Terror of Astandalas" })
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
			let stringLength = 0;
			let haveReplied = false;
			for (let winner of winnerList.winners) {
				let newWinner = formatWinnerString(winner) + "\n";
				let newWinnerLength = newWinner.length;

				if ((stringLength + newWinnerLength) <= 4096) {
					winnerString += formatWinnerString(winner) + "\n";
					stringLength += newWinnerLength;
				}
				else {
					// The string has gotten too big for a single message. Send a reply now, and 
					// include the rest of the winners in follow up message(s). Don't include the footer here, 
					// that will go on the last follow up message.
					if (!haveReplied) {
						await interaction.reply({
							embeds: [new EmbedBuilder()
								.setTitle("Current Winners of the Discord")
								.setDescription(winnerString)
								.setColor(0xd81b0e)]
						});
						haveReplied = true;
						console.log("Batching Winner List, first batch length " + stringLength);
					}
					else {
						// If we've already replied at least once, send this set of winners as a followup
						await interaction.followUp({
							embeds: [new EmbedBuilder()
								.setTitle("Current Winners of the Discord (continued)")
								.setDescription(winnerString)
								.setColor(0xd81b0e)]
						});
						console.log("Additional batched message, length: " + stringLength);
					}


					// Reset the winnerString to the winner who was too long
					winnerString = newWinner;
					stringLength = newWinnerLength;
				}
			};

			if (!haveReplied) {
				// reply to the command
				await interaction.reply({
					embeds: [new EmbedBuilder()
						.setTitle("Current Winners of the Discord")
						.setDescription(winnerString)
						.setFooter({
							text: winnerList.winners.length + " out of " + winnerList.currentTerrorThreshold + " winners needed for Terror of Astandalas"
						})
						.setColor(0xd81b0e)]
				});
				console.log("Current Winner String Length: " + stringLength);
			}
			else {
				// If we've already replied at least once, send this message as a followup
				await interaction.followUp({
					embeds: [new EmbedBuilder()
						.setTitle("Current Winners of the Discord (continued)")
						.setDescription(winnerString)
						.setFooter({
							text: winnerList.winners.length + " out of " + winnerList.currentTerrorThreshold + " winners needed for Terror of Astandalas"
						})
						.setColor(0xd81b0e)]
				});
				console.log("Final batched message, length: " + stringLength);
			}
		}
	},
};
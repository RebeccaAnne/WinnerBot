var fs = require("fs");
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getWinnerListDisplyStrings, getWinnerListFooterString } = require("../showWinnersHelper")

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

		// The winner string may be too big for a single message. If so, winnerStringArray 
		// will contain multiple message sized strings.
		let winnerStringArray = getWinnerListDisplyStrings(guild);

		if (winnerStringArray.length == 0) {

			// Special case for no current winners
			await interaction.reply({
				embeds: [new EmbedBuilder()
					.setTitle("No current winners!")
					.setFooter({ text: getWinnerListFooterString(guild, serverConfig.supportsTerrors) })
					.setColor(0xd81b0e)]
			});
		}
		else {
			// If we have more than one string, send the first string as a reply, and 
			// subsequent strings in in follow up message(s). 
			for (let index = 0; index < winnerStringArray.length; index++) {
				let winnerString = winnerStringArray[index];

				// If this is the last message, set the footer
				let footer = null;
				if (index == winnerStringArray.length - 1) {
					footer = getWinnerListFooterString(guild, serverConfig.supportsTerrors);
				}

				if (index == 0) {
					await interaction.reply({
						embeds: [new EmbedBuilder()
							.setTitle("Current Winners of the Discord")
							.setDescription(winnerString)
							.setFooter({ text: footer })
							.setColor(0xd81b0e)]
					});
				}
				else {

					await interaction.followUp({
						embeds: [new EmbedBuilder()
							.setTitle("Current Winners of the Discord (continued)")
							.setDescription(winnerString)
							.setFooter({ text: footer })
							.setColor(0xd81b0e)]
					});
				}
			}
		}
	}
}
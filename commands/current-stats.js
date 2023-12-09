var fs = require("fs");
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getStatsDisplayString } = require("../statsHelper");


module.exports = {
	data: new SlashCommandBuilder()
		.setName('current-stats')
		.setDescription('Displays information about the numbers and kinds of works that are currently winning the discord.'),
	async execute(interaction) {

		let guild = interaction.guild;
		let statsDisplayString = getStatsDisplayString(guild.id);

		let dataFile = require("../winner-and-event-data.json");
		let serverConfig = require("../data/server-config-" + guild.id + ".json");
		let serverData = dataFile[guild.id];

		footer = serverConfig.supportsTerrors ?
			serverData.winners.length + " out of " + serverData.currentTerrorThreshold + " winners needed for Terror of Astandalas" :
			null

		await interaction.reply({
			embeds: [new EmbedBuilder()
				.setTitle("This Week in the Arts")
				.setDescription(statsDisplayString)
				.setFooter({ text: footer })
				.setColor(0xd81b0e)]
		});
	},
};
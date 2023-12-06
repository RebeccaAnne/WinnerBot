var fs = require("fs");
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getStatsDisplayString } = require("../statsHelper");


module.exports = {
	data: new SlashCommandBuilder()
		.setName('current-stats')
		.setDescription('Displays information about the numbers and kinds of works that are currently winning the discord.'),
	async execute(interaction) {

		let guild = interaction.guild;
		let descriptionString = getStatsDisplayString(guild.id);

		await interaction.reply({
			embeds: [new EmbedBuilder()
				.setTitle("This Week in the Arts")
				.setDescription(descriptionString)
				.setColor(0xd81b0e)]
		});
	},
};
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('add-winner')
		.setDescription('Adds a new Winner of the Discord'),
	async execute(interaction) {
		await interaction.reply('Pong!');
	},
};
const { SlashCommandBuilder } = require('discord.js');
const dayjs = require('dayjs');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('add-winner')
		.setDescription('Adds a new Winner of the Discord')
		.addUserOption(option =>
			option.setName('winner')
				.setDescription('The user who won the discord')
				.setRequired(true))
		.addStringOption(option =>
			option.setName('reason')
				.setDescription('The reason for winning')
				.setRequired(true)),
	async execute(interaction) {
		let winner = interaction.options.getMember('winner');
		let reason = interaction.options.getString('reason');
		let role = interaction.options.getRole('role');


		let winnerRole = await interaction.guild.roles.fetch('1115079835912507433');

		let replyString = `${winner} won the discord`;

		if (reason) {
			replyString += " for " + reason;
		}

		replyString += "!";

		await interaction.reply(replyString);	
		
		winner.roles.add(winnerRole);


		let winnerObject = {};
		winnerObject.username = winner.username;
		winnerObject.id = winner.id;
		winnerObject.dateTimestamp = Date.now();
		winnerObject.date = dayjs(winnerObject.dateTimestamp).format("YYYY-MM-DD");

		if (reason) {
			winnerObject.reason = reason;
		}
	},
};
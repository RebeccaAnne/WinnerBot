var fs = require("fs");
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
		let guild = interaction.guild;

		winnerFilename = "winner-arrays.json";

		let winnerList = {}
		try {
			winnerList = require("..\\" + winnerFilename);
		}
		catch (error) {
			console.log("Failed to load serverArrays from file");
		}

		if (winnerList[guild.id] == null) {
			winnerList[guild.id] = [];
		}

		console.log("Current winner list:\n" + winnerList[guild.id]);

		let replyString = "";

		if (winnerList[guild.id].length == 2) {
			//Terror!!
			replyString = `Terror of Astandalas!`;

			winnerList[guild.id].forEach(async winner => {
				let currentMember = await guild.members.fetch(winner.id)
				currentMember.roles.remove('1115079835912507433');
			});

			winnerList[guild.id] = []
		}
		else {
			// Set the winner role
			let winnerRole = await guild.roles.fetch('1115079835912507433');
			winner.roles.add(winnerRole);

			// Write the winner data to file
			let winnerObject = {};
			winnerObject.username = winner.user.username;
			winnerObject.id = winner.id;
			winnerObject.date = dayjs(Date.now()).format("YYYY-MM-DD");
			winnerObject.reason = reason;

			winnerList[guild.id].push(winnerObject);


			replyString = winner.user.username + " won the discord for " + reason + "!";
		}

		fs.writeFileSync(winnerFilename, JSON.stringify(winnerList), () => { });

		// reply to the command
		await interaction.reply(replyString);
	},
};

var fs = require("fs");
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
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
				.setRequired(true))
		.addStringOption(option =>
			option.setName('date')
				.setDescription('Date won')),
	async execute(interaction) {
		let winner = interaction.options.getMember('winner');
		let reason = interaction.options.getString('reason');
		let guild = interaction.guild;

		// Set the date won based on passed in parameter or today's date
		let dateWon = dayjs(Date.now());
		let dateWonInput = interaction.options.getString('date');
		if (dateWonInput) {
			dateWon = dayjs(dateWonInput);
			if (!dateWon.isValid()) {
				await interaction.reply({
					embeds: [new EmbedBuilder().setDescription("Invalid Date String. Use YYYY-MM-DD format, or skip this parameter to use today's date.")],
					ephemeral: true
				});
				return;
			}
		}

		// Load the winner array from file
		winnerFilename = "winner-arrays.json";
		let winnerList = {}
		try {
			winnerList = require("..\\" + winnerFilename);
		}
		catch (error) {
			console.log("Failed to load serverArrays from file");
		}

		// Create a winner list for this server if one doesn't already exist
		if (winnerList[guild.id] == null) {
			winnerList[guild.id] = [];
		}

		// Check if this user is already a winner
		let winnerObject = {};
		let newWinner = true;
		winnerList[guild.id].forEach(async existingWinner => {
			if (winner.id == existingWinner.id) {
				console.log("Updating existing winner")
				winnerObject = existingWinner;
				newWinner = false;
			}
		});

		// Fill in the winner object
		winnerObject.username = winner.user.username;
		winnerObject.id = winner.id;
		winnerObject.date = dateWon.format("YYYY-MM-DD");
		winnerObject.reason = reason;

		// Set the winner role
		let winnerRole = await guild.roles.fetch('1115079835912507433');
		winner.roles.add(winnerRole);

		if (newWinner) {
			winnerList[guild.id].push(winnerObject);
		}

		let replyString = winner.user.username + " won the discord for " + reason + "!";

		if (winnerList[guild.id].length == 3) {
			//Terror!!
			replyString += "\nTerror of Astandalas!";

			winnerList[guild.id].forEach(async winner => {
				let currentMember = await guild.members.fetch(winner.id)
				currentMember.roles.remove('1115079835912507433');
			});

			winnerList[guild.id] = []
		}

		fs.writeFileSync(winnerFilename, JSON.stringify(winnerList), () => { });

		// reply to the command
		await interaction.reply(replyString);
	},
};

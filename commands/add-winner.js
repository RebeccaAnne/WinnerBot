var fs = require("fs");
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const dayjs = require('dayjs');

function getOrdinal(n) {
	let ord = 'th';

	if (n % 10 == 1 && n % 100 != 11) {
		ord = 'st';
	}
	else if (n % 10 == 2 && n % 100 != 12) {
		ord = 'nd';
	}
	else if (n % 10 == 3 && n % 100 != 13) {
		ord = 'rd';
	}

	return ord;
}

async function declareTerror(guild, serverConfig, winnerList) {

	terrorCount = 1;
	if (winnerList[guild.id + "-celebrationCount"]) {
		terrorCount = winnerList[guild.id + "-celebrationCount"] + 1;
	}

	let terrorString = "The " + terrorCount + getOrdinal(terrorCount) + " " + serverConfig.celebrationName + "! ";

	for (winner of winnerList[guild.id + "-winners"]) {
		terrorString += "<@" + winner.id + "> ";

		let currentMember = await guild.members.fetch(winner.id);
		currentMember.roles.remove(serverConfig.winnerRoleId);
	};

	try {
		let terrorChannel = await guild.channels.fetch(serverConfig.celebrationChannel);
		await terrorChannel.send(terrorString);
	}
	catch (error) {
		console.log(error);
	}

	winnerList[guild.id + "-winners"] = [];
	winnerList[guild.id + "-celebrationCount"] = terrorCount;
}

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
				.setDescription("Date won (YYYY-MM-DD), defaults to today's date")),
	async execute(interaction) {
		let winner = interaction.options.getMember('winner');
		let reason = interaction.options.getString('reason');
		let guild = interaction.guild;

		let serverConfig = require("../data/server-config-" + guild.id + ".json");

		// Does this user have permission to add winners?
		let callingMember = await guild.members.fetch(interaction.user.id);
		let hasPermission = false;
		serverConfig.modRoles.forEach(modRole => {
			if (callingMember.roles.cache.some(role => role.id === modRole)) {
				hasPermission = true;
			}
		});

		if (!hasPermission) {
			await interaction.reply({
				content: "Only " + serverConfig.accessDescription + " have permission to add discord winners", ephemeral: true
			});
			return;
		}

		// Are we in the correct channel to manage winners?
		if (interaction.channel.id != serverConfig.modChannel) {
			await interaction.reply({
				content: "Please manage discord winners in the " + serverConfig.modChannelDescription + " channel", ephemeral: true
			});
			return;
		}

		// Set the date won based on passed in parameter or today's date
		let dateWon = dayjs(Date.now());
		let dateWonInput = interaction.options.getString('date');
		if (dateWonInput) {
			dateWon = dayjs(dateWonInput);
			if (!dateWon.isValid()) {
				await interaction.reply({
					content: "Invalid Date String. Use YYYY-MM-DD format, or skip this parameter to use today's date.", ephemeral: true
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
		if (winnerList[guild.id + "-winners"] == null) {
			winnerList[guild.id + "-winners"] = [];
		}

		// Check if this user is already a winner
		let winnerObject = {};
		let newWinner = true;
		for (existingWinner of winnerList[guild.id + "-winners"]) {
			if (winner.id == existingWinner.id) {
				winnerObject = existingWinner;
				newWinner = false;
				break;
			}
		};

		// Fill in the winner object
		winnerObject.username = winner.user.username;
		winnerObject.id = winner.id;
		winnerObject.date = dateWon.format("YYYY-MM-DD");
		winnerObject.reason = reason;

		// Set the winner role 
		let winnerRole = await guild.roles.fetch(serverConfig.winnerRoleId);
		winner.roles.add(winnerRole);

		if (newWinner) {
			winnerList[guild.id + "-winners"].push(winnerObject);
		}

		let replyString = "Winner added:\n" + "● " + winnerObject.username + ": " + winnerObject.reason + " (" + winnerObject.date + ")";

		if (winnerList[guild.id + "-winners"].length >= serverConfig.celebrationThreshold) {
			//Terror!!
			await declareTerror(guild, serverConfig, winnerList);
			replyString += "\n" + serverConfig.celebrationName + "!";
		}

		fs.writeFileSync(winnerFilename, JSON.stringify(winnerList), () => { });

		let fileLogStream = fs.createWriteStream("permanentRecord.txt", { flags: 'a' });
		fileLogStream.write(winnerObject.date + "\t" + winnerObject.username +"\t" + winnerObject.reason + "\n");

		// Post a congradulatory message in fanworks
		let fanworksChannel = await interaction.guild.channels.fetch(serverConfig.fanworksChannel);
		fanworksChannel.send("Congratulations <@" + winner.id + "> on winning the discord for " + reason + "!");

		// reply to the command
		await interaction.reply(replyString);
	},
};

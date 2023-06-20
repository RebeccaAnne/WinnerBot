var fs = require("fs");
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const dayjs = require('dayjs');
const { scheduleExpirationCheck } = require('../expire-schedule');


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
	if (winnerList.terrorCount) {
		terrorCount = winnerList.terrorCount + 1;
	}

	let terrorString = "The " + terrorCount + getOrdinal(terrorCount) + " Terror of Astandalas! ";

	for (winner of winnerList.winners) {
		terrorString += "<@" + winner.id + "> ";

		let currentMember = await guild.members.fetch(winner.id);
		currentMember.roles.remove(serverConfig.winnerRoleId);
	};

	let terrorChannel = await guild.channels.fetch(serverConfig.terrorAnnouncementChannel);
	await terrorChannel.send(terrorString);

	if (winnerList.lastTerrorDate) {
		let lastTerrorDate = dayjs(winnerList.lastTerrorDate);
		let dateCutoff = dayjs().subtract(serverConfig.winDurationInDays, "day");

		if (lastTerrorDate.isAfter(dateCutoff)) {
			// Update the terror threshold
			winnerList.currentTerrorThreshold++;

			let fanworksChannel = await guild.channels.fetch(serverConfig.fanworksChannel);
			fanworksChannel.send({
				embeds: [new EmbedBuilder()
					.setTitle("The Terrors of Astandalas have Leveled Up!")
					.setDescription("Due to Terrors successfully striking the glorious Empire of Astandalas twice in one week, the empire has increased its guard. It will now take "
						+ winnerList.currentTerrorThreshold +
						" members to create a Terror!")
					.setColor(0xd81b0e)]
			})
		}
	}

	winnerList.winners = [];
	winnerList.terrorCount = terrorCount;
	winnerList.lastTerrorDate = dayjs(Date.now()).format("YYYY-M-D");
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
				.setDescription("Date won")),
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
		if (interaction.channelId != serverConfig.modChannel) {
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
		let winnerListFile = require("../" + winnerFilename);
		if (winnerListFile[guild.id] == null) {
			winnerListFile[guild.id] = {};
		}

		let winnerList = winnerListFile[guild.id];

		// Create a winner list for this server if one doesn't already exist
		if (winnerList.winners == null) {
			winnerList.winners = [];
		}

		// Check if this user is already a winner
		let winnerObject = {};
		let newWinner = true;
		for (existingWinner of winnerList.winners) {
			if (winner.id == existingWinner.id) {
				winnerObject = existingWinner;
				newWinner = false;
				break;
			}
		};

		// Fill in the winner object
		winnerObject.username = winner.displayName;
		winnerObject.id = winner.id;
		winnerObject.date = dateWon.format();
		winnerObject.reason = reason;

		// Set the winner role 
		let winnerRole = await guild.roles.fetch(serverConfig.winnerRoleId);
		winner.roles.add(winnerRole);

		if (newWinner) {
			winnerList.winners.push(winnerObject);
		}

		let replyDate = "<t:" + dateWon.unix() + ":f>";
		let replyString = "**Winner added:**\n" + "**" + winnerObject.username + "**: " + winnerObject.reason + ", " + replyDate;

		let logstring = winnerObject.date + "\t" + winnerObject.username + "\t" + winnerObject.reason;
		let fileLogStream = fs.createWriteStream("permanentRecord.txt", { flags: 'a' });
		fileLogStream.write(logstring + "\n");
		console.log(logstring);

		// Construct a congratulatory message to post in fanworks
		congratsMessage = "Congratulations <@" + winner.id + "> on winning the discord for " + reason;

		// Check for a terror
		let terror = false;
		if (winnerList.winners.length >= winnerList.currentTerrorThreshold) {

			// Update the command reply and the congrats message to indicate the terror
			replyString += "\n\n**Terror of Astandalas**!";
			congratsMessage += " and triggering a Terror of Astandalas";
			terror = true;
		}
		congratsMessage += "!";

		// Set the congrats message before declaring the terror, because terror declarations can also cause posts to fanworks
		let fanworksChannel = await interaction.guild.channels.fetch(serverConfig.fanworksChannel);
		fanworksChannel.send(congratsMessage);

		if (terror) {
			// declareTerror will manage removing the winners from the list, 
			// removing their roles, and posting the terror message.
			await declareTerror(guild, serverConfig, winnerList);
		}
		else {
			// If there's not a terror, schedule a expiration check for this winner
			scheduleExpirationCheck(winnerObject, serverConfig)
		}

		fs.writeFileSync(winnerFilename, JSON.stringify(winnerListFile), () => { });

		// reply to the command
		await interaction.reply({
			embeds: [new EmbedBuilder()
				.setDescription(replyString)]
		});
	},
};

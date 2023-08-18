const dayjs = require('dayjs');
var fs = require("fs");
const { EmbedBuilder } = require('discord.js');
const { winnerNameList } = require('./utils');

async function declareTerror(guild, serverConfig, winnerList) {

    terrorCount = 1;
    if (winnerList.terrorCount) {
        terrorCount = winnerList.terrorCount + 1;
    }

    let terrorString = "The " + terrorCount + getOrdinal(terrorCount) + " Terror of Astandalas! ";

    for (winner of winnerList.winners) {
        terrorString += "<@" + winner.id + "> ";

        let currentMember = await guild.members.fetch(winner.id);
        await currentMember.roles.remove(serverConfig.winnerRoleId);
    };

    let terrorChannel = await guild.channels.fetch(serverConfig.terrorAnnouncementChannel);
    await terrorChannel.send(terrorString);

    if (winnerList.lastTerrorDate) {
        let lastTerrorDate = dayjs(winnerList.lastTerrorDate);
        let dateCutoff = dayjs().subtract(serverConfig.winDurationInDays, "day");

        // Add an extra hour of buffer
        dateCutoff = dateCutoff.subtract(1, "hour");

        if (lastTerrorDate.isAfter(dateCutoff)) {
            // Update the terror threshold
            winnerList.currentTerrorThreshold++;

            let fanworksAnnouncementChannel = await guild.channels.fetch(serverConfig.fanworksAnnouncementChannel);
            fanworksAnnouncementChannel.send({
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
    winnerList.lastTerrorDate = dayjs(Date.now()).format();
}

function getWinObject(winnerList, winnerId) {
    for (existingWinner of winnerList.winners) {
        if (winnerId == existingWinner.id) {
            return existingWinner;
        }
    };

    return null;
}

async function addWinners(guild, serverConfig, newWinners, reason, link) {

    // Set the date won 
    let dateWon = dayjs(Date.now());

    // Load the winner array from file
    winnerFilename = "winner-and-event-data.json";
    let winnerListFile = require("./" + winnerFilename);
    if (winnerListFile[guild.id] == null) {
        winnerListFile[guild.id] = {};
    }

    let winnerList = winnerListFile[guild.id];

    // Create a winner list for this server if one doesn't already exist
    if (winnerList.winners == null) {
        winnerList.winners = [];
    }

    for (const winner of newWinners) {

        let winnerObject = {};
        let newWinner = true;

        // Check if this user is already a winner
        existingWinner = getWinObject(winnerList, winner.id);
        if (existingWinner) {
            winnerObject = existingWinner;
            newWinner = false;
        }

        // Fill in the winner object with the user information
        winnerObject.username = winner.displayName;
        winnerObject.id = winner.id;

        // Create a win array if one doesn't already exist
        if (winnerObject.wins == null) {
            winnerObject.wins = [];
        }

        // Create a win object and add it to the winner
        win = {}
        win.date = dateWon.format();
        win.reason = reason;
        win.link = link;
        winnerObject.wins.push(win);

        // Set the winner role 
        let winnerRole = await guild.roles.fetch(serverConfig.winnerRoleId);
        winner.roles.add(winnerRole);

        // Schcedule an expiration check for the winner
        await scheduleWinnerExpirationCheck(winnerObject, guild, serverConfig)

        if (newWinner) {
            winnerList.winners.push(winnerObject);
        }

        let logstring = dayjs(winnerObject.date).format() + "\t" + winner.displayName + "\t" + reason;
        let fileLogStream = fs.createWriteStream("permanentRecord.txt", { flags: 'a' });
        fileLogStream.write(logstring + "\n");
        console.log(logstring);
    }

    // Construct a congratulatory message to post in fanworks
    congratsMessage = "Congratulations" + winnerNameList(newWinners) + " on winning the discord for " + formatWinnerReason(win);

    // Check for a terror
    let terror = false;
    if (winnerList.winners.length >= winnerList.currentTerrorThreshold) {

        // Update the congrats message to indicate the terror
        congratsMessage += " and triggering a Terror of Astandalas";
        terror = true;
    }
    congratsMessage += "!";

    // Set the congrats message before declaring the terror, because terror declarations can also cause posts to fanworks
    let fanworksAnnouncementChannel = await guild.channels.fetch(serverConfig.fanworksAnnouncementChannel);
    fanworksAnnouncementChannel.send({
        embeds: [new EmbedBuilder()
            .setDescription(congratsMessage)
            .setColor(0xd81b0e)]
    });

    if (terror) {
        // declareTerror will manage removing the winners from the list, 
        // removing their roles, and posting the terror message.
        await declareTerror(guild, serverConfig, winnerList);
    }

    fs.writeFileSync(winnerFilename, JSON.stringify(winnerListFile), () => { });

    return winnerList;
}

module.exports = { addWinners, getWinObject }
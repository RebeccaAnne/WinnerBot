const dayjs = require('dayjs');
const fs = require("fs");
const { URL } = require('url');
const { EmbedBuilder } = require('discord.js');
const { winnerNameList, getListSeparator } = require('./utils');

async function declareTerror(guild, serverConfig, winnerList) {

    console.log("Declaring Terror")

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

    let terrorChannel = await guild.channels.fetch(serverConfig.terrorRecordingChannel);
    await terrorChannel.send(terrorString);

    // let announcmentString = getStatsDisplayString(guild.id, true);
    // for (terrorAnnouncementChannelId of serverConfig.terrorAnnouncementChannels) {
    //     let terrorAnnouncementChannel = await guild.channels.fetch(terrorAnnouncementChannelId);
    //     await terrorAnnouncementChannel.send({
    //         embeds: [new EmbedBuilder()
    //             .setTitle("The Terrors of Astandalas have Struck Again!")
    //             .setDescription(announcmentString)
    //             .setColor(0xd81b0e)]
    //     })
    // }

    if (winnerList.lastTerrorDate) {
        let lastTerrorDate = dayjs(winnerList.lastTerrorDate);
        let dateCutoff = dayjs().subtract(serverConfig.winDurationInDays, "day");

        // Add an extra hour of buffer
        dateCutoff = dateCutoff.subtract(1, "hour");

        if (lastTerrorDate.isAfter(dateCutoff)) {
            // Update the terror threshold
            winnerList.currentTerrorThreshold++;

            let fanworksAnnouncementChannel = await guild.channels.fetch(serverConfig.fanworksAnnouncementChannel);
            await fanworksAnnouncementChannel.send({
                embeds: [new EmbedBuilder()
                    .setTitle("The Terrors of Astandalas have Leveled Up!")
                    .setDescription("Due to Terrors successfully striking the glorious Empire of Astandalas twice in one week, the empire has increased its guard. It will now take "
                        + winnerList.currentTerrorThreshold +
                        " Winners of the Discord to create a Terror!")
                    .setColor(0xd81b0e)]
            })
        }
    }

    winnerList.winners = [];
    winnerList.terrorCount = terrorCount;
    winnerList.lastTerrorDate = dayjs(Date.now()).format();
    winnerList.lastNMinusOne = null;
}

function getWinObject(winnerList, winnerId) {
    for (existingWinner of winnerList.winners) {
        if (winnerId == existingWinner.id) {
            return existingWinner;
        }
    };

    return null;
}

async function callGalleryBot(guild, serverConfig, newWinners, link, workType) {

    let workTypeDefinition =
        getFanWorkTypes().find(typeDefinition => typeDefinition.typeString.toUpperCase() == workType.toUpperCase());

    // Is this a type we put in the gallery?
    if (workTypeDefinition && workTypeDefinition.isGalleryType) {
        let workUrl = new URL(link);

        // Path format for a discord message is discord.com/channels/[serverId]/[channelId]/[messageId]
        let winHostName = workUrl.hostname;
        let pathSegments = workUrl.pathname.split("/")
        let workServerId = pathSegments[2];
        let workChannelId = pathSegments[3];
        let workMessageId = pathSegments[4];

        // Do we have a valid discord message link in the current server?
        if (winHostName == "discord.com" &&
            pathSegments[1] == "channels" &&
            workServerId && workServerId == guild.id &&
            workChannelId && workMessageId) {

            // Get the messages that came in this channel after the winning work. We're looking to see if
            // the gallery bot has already been called.
            let workChannel = await guild.channels.fetch(workChannelId);
            let messagesAfterWin = await workChannel.messages.fetch({ after: workMessageId })

            // Look for a reply to the winning message from the gallery bot
            if (!messagesAfterWin.find(message =>
                (message.reference?.messageId == workMessageId) &&
                (message.author.id == serverConfig.galleryBot))) {

                // The gallery bot hasn't been called yet, let's call the bot!

                // Get the message we're going to reply to 
                let workMessage = await workChannel.messages.fetch(workMessageId)

                // If the art was posted in the fanworks announcements channel, simply reply with 
                // an @ to the gallery bot since we've just posted the congrats message here and we
                // don't want to be too verbose. If we're in a different channel, go ahead and make
                //  a little embed to describe what's happening.
                // NOTE: The embed version didn't work, I think it's confusing G. Bot :(
                // Commenting it out and trying just a direct @ for now
                //if (workChannelId == serverConfig.fanworksAnnouncementChannel) {
                await workMessage.reply({
                    content: "<@" + serverConfig.galleryBot + ">"
                });
                //}
                //         else {

                //             // Build up the description string for the embed
                //             let galleryBotEmbedDescription = "";
                //             for (i = 0; i < newWinners.length; i++) {
                //                 // Add the winner(s) name(s) to the string
                //                 galleryBotEmbedDescription += getListSeparator(i, newWinners.length);
                //                 galleryBotEmbedDescription += "**" + newWinners[i].displayName + "** ";
                //             }

                //             // Get the gallery bot's name 
                //             let galleryBotMember = await guild.members.fetch(serverConfig.galleryBot);

                //             galleryBotEmbedDescription += handlePlural(newWinners.length, "has", "have");
                //             galleryBotEmbedDescription += " released a new work. Sources say curator ";
                //             galleryBotEmbedDescription += galleryBotMember.displayName;
                //             galleryBotEmbedDescription += " hopes to acquire it for the gallery."

                //             // Send a reply
                //             await workMessage.reply({
                //                 content: "<@" + serverConfig.galleryBot + ">",
                //                 embeds: [new EmbedBuilder()
                //                     .setTitle("Arts and Entertainment")
                //                     .setDescription(galleryBotEmbedDescription)
                //                     .setColor(0xd81b0e)]
                //             });
                //         }
            }
            else {
                console.log("Not calling gallery bot because it has already responded.")
            }
        }
        else {
            console.log("Not calling gallery bot because link is not a discord message: " + workUrl)
        }

    }
}

async function addWinners(guild, serverConfig, newWinners, reason, link, workType, dateTimeParameter) {

    // Set the date won
    let dateWon = dateTimeParameter ?? dayjs();
    let winResponseString = "";

    let terror = false;
    await getMutex().runExclusive(async () => {

        // Load the winner array from file
        winnerFilename = "winner-and-event-data.json";
        let winnerListFile = require("./" + winnerFilename);
        if (winnerListFile[guild.id] == null) {
            winnerListFile[guild.id] = {};
        }

        let serverData = winnerListFile[guild.id];

        // Create a winner list for this server if one doesn't already exist
        if (serverData.winners == null) {
            serverData.winners = [];
        }

        for (i = 0; i < newWinners.length; i++) {

            let winner = newWinners[i];

            let winnerObject = {};
            let newWinner = true;

            // Check if this user is already a winner
            existingWinner = getWinObject(serverData, winner.id);
            if (existingWinner) {
                winnerObject = existingWinner;
                newWinner = false;
            }

            // Fill in the winner object with the user information
            winnerObject.username = winner.displayName;
            winnerObject.id = winner.id;

            // Add the winner name to the string
            winResponseString += getListSeparator(i, newWinners.length);
            winResponseString += "**" + winner.displayName + "**";

            // Create a win array if one doesn't already exist
            if (winnerObject.wins == null) {
                winnerObject.wins = [];
            }

            // Create a win object and add it to the winner
            let win = {};
            win.date = dateWon.format();
            win.reason = reason;
            win.link = link;
            win.workType = workType;
            winnerObject.wins.push(win);

            // Update the work type count
            if (!serverData.workTypeCounts[workType]) {
                serverData.workTypeCounts[workType] = 1;
            }
            else {
                serverData.workTypeCounts[workType]++;
            }

            // If we were passed a dateTimeParameter, re-sort the wins in case this was added as an older win
            winnerObject.wins.sort((a, b) => {
                let aDate = dayjs(a.date);
                let bDate = dayjs(b.date);

                if (aDate.isBefore(bDate)) { return -1; }
                else if (bDate.isBefore(aDate)) { return 1; }
                else { return 0; }
            });

            // Set the winner role 
            let winnerRole = await guild.roles.fetch(serverConfig.winnerRoleId);
            winner.roles.add(winnerRole);

            // Schcedule an expiration check for the winner
            await scheduleWinExpirationCheck(win, guild, serverConfig)

            if (newWinner) {
                serverData.winners.push(winnerObject);
            }

            let logstring = dayjs(winnerObject.date).format() + "\t" + winner.displayName + "\t" + reason;
            let fileLogStream = fs.createWriteStream("permanentRecord.txt", { flags: 'a' });
            fileLogStream.write(logstring + "\n");
            console.log(logstring);
        }

        winResponseString += ": " +
            formatWinnerReason({ reason: reason, link: link, workType: workType }) + ", "
            + "<t:" + dateWon.unix() + ":f>"

        // Construct a congratulatory message to post in fanworks
        congratsMessage =
            "Congratulations " + winnerNameList(newWinners) +
            " on winning the discord for " +
            formatWinnerReason({ reason: reason, link: link, workType: workType });

        // Check for a terror
        if (serverConfig.supportsTerrors &&
            serverData.winners.length >= serverData.currentTerrorThreshold) {

            // Update the congrats and response messages to indicate the terror
            congratsMessage += " and triggering a Terror of Astandalas";
            winResponseString += "\nTerror of Astandalas!"
            terror = true;
        }
        congratsMessage += "!";

        // If there was an explicit date/time, include it in the congrats string 
        if (dateTimeParameter) {
            congratsMessage += "\n(*" + "<t:" + dateWon.unix() + ":f>*)";
        }

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
            await declareTerror(guild, serverConfig, serverData);
        }

        fs.writeFileSync(winnerFilename, JSON.stringify(winnerListFile), () => { });
    });

    if (terror) {
        // Schedule an n-1 check if this winner caused us to hit a terror
        await scheduleNMinusOneCheck(guild, serverConfig);
    }

    if (serverConfig.galleryBot) {
        callGalleryBot(guild, serverConfig, newWinners, link, workType);
    }

    return winResponseString;
}

module.exports = { addWinners, getWinObject, declareTerror }

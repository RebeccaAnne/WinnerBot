const dayjs = require('dayjs');
const { Mutex } = require('async-mutex');
var fs = require("fs");
const { normalize } = require('path');

getOrdinal = (n) => {
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

formatWinnerReason = (winObject) => {

    let reasonString = "[" + winObject.reason + "](" + winObject.link + ")";
    
    let type = getFanWorkTypes().find(element => element.typeString.toUpperCase() == winObject.workType.toUpperCase());
    if (type) {
        reasonString += " " + type.icon;
    }
    else {
        reasonString += " :sparkles:";
    }

    return reasonString;
}

normalizeString = (string) => {
    return string.toUpperCase().trim().replace('`', '\'').replace('’', '\'').replace('‘', '\'').replace('“', '\"').replace('”', '\"');
}

formatWinnerString = (winnerObject) => {
    let winnerString = "**" + winnerObject.username + "**: ";
    let winsToDisplay = [];

    winnerObject.wins.forEach(win => {

        let winToDisplay = winsToDisplay.find(element =>
            normalizeString(element.reason) == normalizeString(win.reason) &&
            normalizeString(element.workType) == normalizeString(win.workType));

        if (winToDisplay) {
            Object.assign(winToDisplay, win);
            winToDisplay.count++;
        }
        else {
            winToDisplay = structuredClone(win);
            winToDisplay.count = 1;
            winsToDisplay.push(winToDisplay);
        }
    })

    for (i = 0; i < winsToDisplay.length; i++) {
        win = winsToDisplay[i];

        // Bulleted list makes the result very long, so not doing this for now
        // if (winsToDisplay.length > 1) {
        //     winnerString += "\n- ";
        // }

        winnerString += formatWinnerReason(win);

        if (win.count > 1) {
            winnerString += " (**" + win.count;

            let collapseMultiple = getFanWorkTypes().find(
                element => element.typeString.toUpperCase() == win.workType.toUpperCase()).colapseMultiple;

            winnerString += " " + collapseMultiple + "**)";
        }

        winnerString += ", <t:" + dayjs(win.date).unix() + ":d> <t:" + dayjs(win.date).unix() + ":t>";

        if (i < winsToDisplay.length - 1) {
            winnerString += ", "
        }
    }
    return winnerString;
}

isMemberModJs = (serverConfig, callingMember) => {
    let hasPermission = false;
    serverConfig.modRoles.forEach(modRole => {
        if (callingMember.roles.cache.some(role => role.id === modRole)) {
            hasPermission = true;
        }
    });

    return hasPermission;
}

modjsPermissionChannelCheck = async (interaction) => {
    let guild = interaction.guild;
    let serverConfig = require("./data/server-config-" + guild.id + ".json");

    // Does this user have permission to edit winners?
    let callingMember = await guild.members.fetch(interaction.user.id);
    if (!isMemberModJs(serverConfig, callingMember)) {
        return "Only " + serverConfig.accessDescription + " can add and remove winners and event series";
    }

    // Are we in the correct channel to manage winners?
    if (interaction.channelId != serverConfig.modChannel) {
        return "Please manage discord winners and events in the " + serverConfig.modChannelDescription;
    }

    return null;
}

getListSeparator = (index, length) => {
    let separator = "";

    if (index > 0) {

        if (length > 2) {
            separator += ", ";
        }
        else {
            separator += " ";
        }

        if (index == (length - 1)) {
            separator += "and ";
        }
    }
    return separator;
}

winnerNameList = (winners) => {
    let winnerListString = "";
    for (let i = 0; i < winners.length; i++) {
        winnerListString += getListSeparator(i, winners.length);
        winnerListString += "<@" + winners[i].id + ">";
    }

    return winnerListString;
}

tryParseHammerTime = (dateTimeString) => {
    // Check if we match the hammer time regex
    const hammerTimeRegex = /<t:\d{10}:[dDtTfFR]>/g;
    if (!dateTimeString.match(hammerTimeRegex)) { return null; }

    try {
        // Parse the timestamp as a dayjs
        let date = dayjs(Number(dateTimeString.slice(3, 13)) * 1000).format();
        return date;
    }
    catch { return null; }
}

tryParseYYYYMMDD = (dateTimeString) => {

    // Check if we match the regex
    const regex = /\d{4}-\d{2}-\d{2}/g;
    if (!dateTimeString.match(regex)) { return null; }

    try {
        // Parse the string as a dayjs to confirm it's a valid date;
        let date = dayjs(dateTimeString)
        return dateTimeString;
    }
    catch { return null; }
}

let globalMutex;

getMutex = () => {
    if (!globalMutex) {
        globalMutex = new Mutex();
    }
    return globalMutex;
}

getFanWorkTypes = () => {
    return [
        { typeString: "Fan Fiction", icon: ":pencil:", colapseMultiple: "chapters" },
        { typeString: "Art", icon: ":art:", colapseMultiple: "pieces" },
        { typeString: "Poetry", icon: ":scroll:", colapseMultiple: "poems" },
        { typeString: "Event", icon: ":calendar:", colapseMultiple: "events" },
        { typeString: "Emoji", icon: "", colapseMultiple: "emojis" },
        { typeString: "Ceramics", icon: ":amphora:", colapseMultiple: "pieces" },
        { typeString: "Fiber Art (yarn)", icon: ":yarn:", colapseMultiple: "pieces" },
        { typeString: "Fiber Art (thread)", icon: ":thread:", colapseMultiple: "pieces" },
        { typeString: "Carving", icon: ":carpentry_saw:", colapseMultiple: "pieces" },
        { typeString: "Game", icon: ":chess_pawn:", colapseMultiple: "updates" },
        { typeString: "Bot Work", icon: ":robot:", colapseMultiple: "updates" },
        { typeString: "Server Boost", icon: ":rocket:", colapseMultiple: "boosts" },
        { typeString: "Sticker", icon: ":frame_photo:", colapseMultiple: "stickers" },
        { typeString: "Origami", icon: ":origamiInGlory:", colapseMultiple: "pieces" },
        { typeString: "Animation", icon: ":cinema:", colapseMultiple: "animations" },
        { typeString: "Video", icon: ":cinema:", colapseMultiple: "pieces" },
        { typeString: "Music", icon: ":harp:", colapseMultiple: "pieces" },
    ]
}

module.exports = {
    getFanWorkTypes, normalizeString, getMutex, formatWinnerString, formatWinnerReason, getOrdinal, isMemberModJs, modjsPermissionChannelCheck, winnerNameList, getListSeparator, tryParseYYYYMMDD, tryParseHammerTime
}
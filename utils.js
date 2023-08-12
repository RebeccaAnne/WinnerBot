const dayjs = require('dayjs');

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

    return "[" + winObject.reason + "](" + winObject.link + ")";
}

formatWinnerString = (winnerObject) => {
    let mostRecentWin = winnerObject.wins[winnerObject.wins.length - 1];

    let winDate = dayjs(mostRecentWin.date);
    let displayDate = "<t:" + winDate.unix() + ":f>";

    let winnerString = "**" + winnerObject.username + "**: " + formatWinnerReason(mostRecentWin) + ", " + displayDate;

    return winnerString;
}


// formatWinnerString = (winnerObject) => {

//     let winnerString = "**" + winnerObject.username + "**: ";

//     winnerObject.wins.forEach(win => {
//         winnerString += "\n- ";
//         winnerString += formatWinnerReason(win) + ", "

//         winnerString += "<t:" + dayjs(win.date).unix() + ":f>";
//     })

//     console.log(winnerString);

//     return winnerString;
// }

function isMemeberModJs(serverConfig, callingMember) {
    let hasPermission = false;
    serverConfig.modRoles.forEach(modRole => {
        if (callingMember.roles.cache.some(role => role.id === modRole)) {
            hasPermission = true;
        }
    });

    return hasPermission;
}

async function modjsPermissionChannelCheck(interaction) {
    let guild = interaction.guild;
    let serverConfig = require("./data/server-config-" + guild.id + ".json");

    // Does this user have permission to edit winners?
    let callingMember = await guild.members.fetch(interaction.user.id);
    if (!isMemeberModJs(serverConfig, callingMember)) {
        //    if (!isMemeberModJs(serverConfig, callingMember)) {
        return "Only " + serverConfig.accessDescription + " have permission to manage discord winners and events";
    }

    // Are we in the correct channel to manage winners?
    if (interaction.channelId != serverConfig.modChannel) {
        return "Please manage discord winners and events in the " + serverConfig.modChannelDescription;
    }

    return null;
}

function getListSeparator(index, length) {
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

function winnerNameList(winners) {
    let winnerListString = "";
    for (let i = 0; i < winners.length; i++) {
        winnerListString += getListSeparator(i, winners.length);
        winnerListString += "<@" + winners[i].id + ">";
    }

    return winnerListString;
}

function tryParseHammerTime(dateTimeString) {
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

function tryParseYYYYMMDD(dateTimeString) {

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

module.exports.formatWinnerString = formatWinnerString;
module.exports.formatWinnerReason = formatWinnerReason;
module.exports.getOrdinal = getOrdinal;
module.exports.isMemeberModJs = isMemeberModJs;
module.exports.modjsPermissionChannelCheck = modjsPermissionChannelCheck;
module.exports.winnerNameList = winnerNameList;
module.exports.getListSeparator = getListSeparator;
module.exports.tryParseYYYYMMDD = tryParseYYYYMMDD;
module.exports.tryParseHammerTime = tryParseHammerTime;
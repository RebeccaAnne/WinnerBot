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

winnerUpdatePermissionCheck = async (interaction) => {
    let guild = interaction.guild;
    let serverConfig = require("./data/server-config-" + guild.id + ".json");

    // Does this user have permission to edit winners?
    let callingMember = await guild.members.fetch(interaction.user.id);
    let hasPermission = false;
    serverConfig.modRoles.forEach(modRole => {
        if (callingMember.roles.cache.some(role => role.id === modRole)) {
            hasPermission = true;
        }
    });

    if (!hasPermission) {
        return "Only " + serverConfig.accessDescription + " have permission to manage discord winners";
    }

    // Are we in the correct channel to manage winners?
    if (interaction.channelId != serverConfig.modChannel) {
        return "Please manage discord winners in the " + serverConfig.modChannelDescription + " channel";
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

module.exports.formatWinnerString = formatWinnerString;
module.exports.formatWinnerReason = formatWinnerReason;
module.exports.getOrdinal = getOrdinal;
module.exports.winnerUpdatePermissionCheck = winnerUpdatePermissionCheck;
module.exports.winnerNameList = winnerNameList;
module.exports.getListSeparator = getListSeparator;

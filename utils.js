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
    let winnerString = "**" + winnerObject.username + "**: ";
    let winsToDisplay = [];

    winnerObject.wins.forEach(win => {

        let winToDisplay = winsToDisplay.find(element => element.reason.toUpperCase() == win.reason.toUpperCase())
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

    winsToDisplay.sort((a, b) => {
        let aDate = dayjs(a.date);
        let bDate = dayjs(b.date);

        if (aDate.isBefore(bDate)) { return -1; }
        else if (bDate.isBefore(aDate)) { return 1; }
        else { return 0; }
    });

    for (i = 0; i < winsToDisplay.length; i++) {
        win = winsToDisplay[i];

        // Bulleted list makes the result very long, so not doing this for now
        // if (winsToDisplay.length > 1) {
        //     winnerString += "\n- ";
        // }

        winnerString += formatWinnerReason(win);

        if (win.count > 1) {
            winnerString += " (**" + win.count + " chapters**)"
        }

        winnerString += ", <t:" + dayjs(win.date).unix() + ":d> <t:" + dayjs(win.date).unix() +":t>";

        if (i < winsToDisplay.length - 1) {
            winnerString += ", "
        }
    }
    return winnerString;

}

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

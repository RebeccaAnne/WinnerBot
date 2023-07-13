const dayjs = require('dayjs');

formatWinnerReason = (winnerObject) => {

    return "[" + winnerObject.reason + "](" + winnerObject.link + ")";
}

formatWinnerString = (winnerObject) => {

    let winDate = dayjs(winnerObject.date);
    let displayDate = "<t:" + winDate.unix() + ":f>";

    let winnerString = "**" + winnerObject.username + "**: " + formatWinnerReason(winnerObject) + ", " + displayDate;

    return winnerString;
}

module.exports.formatWinnerString = formatWinnerString;
module.exports.formatWinnerReason = formatWinnerReason;

const dayjs = require('dayjs');

foramtWinnerReason = (winnerObject, includeLink) => {

    reason = "";
    if (includeLink && winnerObject.link) {
        reason = "[" + winnerObject.reason + "](" + winnerObject.link + ")"
    }
    else {
        reason = winnerObject.reason;
    }

    return reason;
}

formatWinnerString = (winnerObject, includeLink) => {

    let winDate = dayjs(winnerObject.date);
    let displayDate = "<t:" + winDate.unix() + ":f>";

    let winnerString = "**" + winnerObject.username + "**: " + foramtWinnerReason(winnerObject, includeLink) + ", " + displayDate;

    return winnerString;
}

module.exports.formatWinnerString = formatWinnerString;
module.exports.foramtWinnerReason = foramtWinnerReason;

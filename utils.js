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


// 
// formatWinnerString = (winnerObject) => {

//     let winnerString = "**" + winnerObject.username + "**: ";

//     foreach(win in winnerObject.wins)
//     {
//         winnerString += "\n\t";
//         winnerString += formatWinnerReason(win) + ", " 

//         winnerString += "<t:" + dayjs(win.date).unix() + ":f>";
//     }

//     return winnerString;
// }

module.exports.formatWinnerString = formatWinnerString;
module.exports.formatWinnerReason = formatWinnerReason;
module.exports.getOrdinal = getOrdinal;

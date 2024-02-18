const dayjs = require('dayjs');
var fs = require("fs");
const { formatWinnerString } = require('./utils');

function getWinnerListFooterString(guild, supportsTerrors) {
    const winnerFilename = "winner-and-event-data.json";
    let winnerListFile = require("./" + winnerFilename);
    let winnerList = winnerListFile[guild.id];

    let footer = null;

    if (supportsTerrors) {
        footer = "";
        if (winnerList.winners.length) {
            footer += winnerList.winners.length + " out of ";
        }
        footer += winnerList.currentTerrorThreshold + " winners needed for Terror of Astandalas";
    }
    return footer;
}

function getWinnerListDisplyStrings(guild) {
    // Load the winner array from file
    const winnerFilename = "winner-and-event-data.json";
    let winnerListFile = require("./" + winnerFilename);
    let winnerList = winnerListFile[guild.id];

    let displayStringArray = [];

    if (winnerList.winners && winnerList.winners.length != 0) {
        winnerList.winners.sort((a, b) => {
            let aDate = dayjs(a.wins[a.wins.length - 1].date);
            let bDate = dayjs(b.wins[b.wins.length - 1].date);

            if (aDate.isBefore(bDate)) { return -1; }
            else if (bDate.isBefore(aDate)) { return 1; }
            else { return 0; }
        });

        let winnerString = "";
        let stringLength = 0;
        for (let winner of winnerList.winners) {

            let newWinner = formatWinnerString(winner) + "\n";
            let newWinnerLength = newWinner.length;

            if ((stringLength + newWinnerLength) <= 4096) {
                winnerString += formatWinnerString(winner) + "\n";
                stringLength += newWinnerLength;
            }
            else {
                // The string has gotten too big for a single message. Put what we have so far in 
                // the array and start a new string
                displayStringArray.push(winnerString);

                // Reset the winnerString to the winner who was too long
                winnerString = newWinner;
                stringLength = newWinnerLength;
            }
        };

        // Put the winner string we've been building in the array
        displayStringArray.push(winnerString);
    }

    return displayStringArray;
}

module.exports = { getWinnerListDisplyStrings, getWinnerListFooterString }

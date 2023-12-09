const dayjs = require('dayjs');
const { handlePlural } = require('./utils');

getStatsDisplayString = (guildId, useTerrorString) => {

    // Load the data from file
    let dataFile = require("./winner-and-event-data.json");
    let serverData = dataFile[guildId];

    let serverConfig = require("./data/server-config-" + guildId + ".json");
    let winnerCount = serverData.winners.length

    let displayString = "";
    if (!useTerrorString) {
        displayString +=
            "There" +
            handlePlural(winnerCount, " is ", " are ") +
            "currently " + winnerCount +
            handlePlural(winnerCount, " winner") +
            " of the discord";
    }
    else {
        displayString += winnerCount +
            " Winners of the Discord have achieved a Terror of Astandalas and had their names commemorated in <#" +
            serverConfig.terrorRecordingChannel + ">! "
    }

    let total = 0;
    let winDataArray = [];
    let firstWinDate = dayjs();
    for (const winner of serverData.winners) {
        for (const win of winner.wins) {

            let existingWinData = winDataArray.find(winData => winData.workType == win.workType);

            let winData = {};
            let workTypeDefinition;
            if (!existingWinData) {

                // Find the work data for this type of work
                workTypeDefinition = getFanWorkTypes().find(workType => workType.typeString == win.workType);

                if (workTypeDefinition) {
                    // See if we have win data with the same statDescriptionString already in our array
                    existingWinData = winDataArray.find(winData => winData.statDescriptionString == workTypeDefinition.statDescriptionString);
                    if (existingWinData) {
                        // In this case we're consolidating two types (ie Fiber Arts (Yarn) and Fiber Arts (Thread))
                        // That are described the same way in the stats block "Fiber Arts Project" but have different icons.
                        // Make sure we've included both icons.
                        if (!existingWinData.icon.includes(workTypeDefinition.icon)) {
                            existingWinData.icon += " " + workTypeDefinition.icon;
                        }
                    }
                }
            }

            if (existingWinData) {
                // Set the earliest win date for this type of work
                if (dayjs(existingWinData.earliestWinDate).isAfter(dayjs(win.date))) {
                    existingWinData.earliestWinDate = win.data;
                }
                // Update the count
                existingWinData.count++;
                winData = existingWinData;
            }
            else {

                // In this case we haven't yet found a work with this work type or statDescriptionString.
                // Create a new winData object
                winData = {
                    workType: win.workType,
                    count: 1,
                    statDescriptionString: workTypeDefinition ? workTypeDefinition.statDescriptionString : win.workType,
                    icon: workTypeDefinition ? workTypeDefinition.icon : ":sparkles:",
                    statDescriptionStringPlural: workTypeDefinition ? workTypeDefinition.statDescriptionStringCustomPlural : null,
                    earliestWinDate: win.date
                };

                winDataArray.push(winData);
            }

            // Special case handling for emojis. If this is an emoji win, pull the emoji out of the win 
            // reason and add it to the icon
            if (winData.workType == "Emoji") {
                const regex = /<:\w+:\d+>/g;
                let customEmoji = win.reason.match(regex);
                if (customEmoji) {
                    winData.icon += customEmoji + " ";
                }
            }

            total++;

            console.log(firstWinDate.format())
            if (dayjs(win.date).isBefore(firstWinDate)) {
                firstWinDate = dayjs(win.date);
                console.log(firstWinDate.format())
            }
        }
    }

    winDataArray.sort((a, b) => {

        let countComparison = b.count - a.count;
        if (countComparison != 0) {
            return countComparison;
        }

        let aDate = dayjs(a.earliestWinDate);
        let bDate = dayjs(b.earliestWinDate);

        if (aDate.isBefore(bDate)) { return -1; }
        else if (bDate.isBefore(aDate)) { return 1; }
        else { return 0; }
    });

    if (total != 0) {
        if (!useTerrorString) { displayString += " with a total of " + total + handlePlural(total, " win") + ". "; }

        displayString += "Since <t:" + firstWinDate.unix() + ":D>" + " at <t:" + firstWinDate.unix() + ":t> they have shared:\n"

        for (const winData of winDataArray) {
            displayString += "- " + winData.count + " " + handlePlural(winData.count, winData.statDescriptionString, winData.statDescriptionStringPlural) + " " + winData.icon + "\n";
        }
    }
    else {
        displayString += ".";
    }

    console.log(displayString);
    return displayString;
}

module.exports = { getStatsDisplayString }
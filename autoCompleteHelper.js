
let seriesNameCache = {};
let eventNameCache = {};

populateEventNameCache = (guildId) => {

    // Load the data from file
    let filename = "winner-and-event-data.json";
    let dataFile = require("./" + filename);
    if (dataFile[guildId] == null) {
        dataFile[guildId] = {};
    }

    let serverData = dataFile[guildId];
    seriesNameCache[guildId] = [];

    eventNameCache[guildId] = {}

    for (let eventSeries of serverData.eventSeries) {

        seriesNameCache[guildId].push(eventSeries.name);
        eventNameCache[guildId][eventSeries.name] = []

        for (let event of eventSeries.events) {
            eventNameCache[guildId][eventSeries.name].push(event.name);
        }
    }
}

addSeriesNameToCache = (guildId, seriesName) => {
    seriesNameCache[guildId].push(seriesName)
}

addEventNameToCache = (guildId, seriesName, eventName) => {
    eventNameCache[guildId][seriesName].push(eventName)
}

getSeriesNames = (guildId) => {
    return seriesNameCache[guildId];
}

getEventNames = (guildId, seriesName) => {
    return eventNameCache[guildId][seriesName];
}

handleSeriesAutoComplete = async (interaction) => {
    let seriesNames = getSeriesNames(interaction.guild.id);

    const focusedValue = interaction.options.getFocused();

    const filtered = seriesNames.filter(choice => {
        return choice.toUpperCase().startsWith(focusedValue.toUpperCase());
    });

    await interaction.respond(
        filtered.map(choice => ({ name: choice, value: choice })),
    );
}

module.exports = {
    populateEventNameCache, addSeriesNameToCache, addEventNameToCache, handleSeriesAutoComplete
}
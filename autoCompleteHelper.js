const { GuildScheduledEventManager } = require('discord.js');

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
        eventNameCache[guildId][eventSeries.name].sort();
    }
    seriesNameCache[guildId].sort();


    // Add voice events to the auto-complete cache
    seriesNameCache[guildId].push("Voice Events");
}

addSeriesNameToCache = (guildId, seriesName) => {
    seriesNameCache[guildId].push(seriesName);
    seriesNameCache[guildId].sort();

    eventNameCache[guildId][seriesName] = [];
}

addEventNameToCache = (guildId, seriesName, eventName) => {
    eventNameCache[guildId][seriesName].push(eventName)
    eventNameCache[guildId][seriesName].sort();
}

removeEventFromToCache = (guildId, seriesName, eventName) => {
    if (eventNameCache[guildId]) {
        if (eventNameCache[guildId][seriesName]) {

            let eventIndex = eventNameCache[guildId][seriesName].findIndex(name => {
                return name.toUpperCase() == eventName.toUpperCase();
            });
            if (eventIndex != -1) {
                eventNameCache[guildId][seriesName].splice(eventIndex, 1);
            }
        }
    }
}

handleSeriesAutoComplete = async (interaction) => {
    let seriesNames = seriesNameCache[interaction.guild.id];

    const focusedOption = interaction.options.getFocused(true);

    if (focusedOption.name === 'series') {
        filtered = seriesNames.filter(choice => {
            return choice.toUpperCase().startsWith(focusedOption.value.toUpperCase());
        });

        await interaction.respond(
            filtered.map(choice => ({ name: choice, value: choice }))
        );
    }

    else if (focusedOption.name === 'event') {
        const seriesName = interaction.options.getString('series');
        if (seriesName) {

            if (seriesName === "Voice Events") {
                const eventManager = new GuildScheduledEventManager(interaction.guild);
                let scheduledEvents = await eventManager.fetch();

                let filtered = scheduledEvents.filter(choice => {
                    return choice.name.toUpperCase().startsWith(focusedOption.value.toUpperCase());
                });

                await interaction.respond(
                    filtered.map(choice => ({ name: choice.name, value: choice.id })),
                );
            }
            else {
                let eventNames = eventNameCache[interaction.guild.id][seriesName];

                let filtered = eventNames.filter(choice => {
                    return choice.toUpperCase().startsWith(focusedOption.value.toUpperCase());
                });

                await interaction.respond(
                    filtered.map(choice => ({ name: choice, value: choice }))
                );
            }
        }
    }
}

module.exports = {
    populateEventNameCache, addSeriesNameToCache, addEventNameToCache, handleSeriesAutoComplete
}
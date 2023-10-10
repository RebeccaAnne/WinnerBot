const { GuildScheduledEventManager } = require('discord.js');
const { getFanWorkTypes } = require('./utils')
const dayjs = require('dayjs');

handleWorkTypeAutoComplete = async (interaction) => {
    let workTypes = getFanWorkTypes();
    const focusedOption = interaction.options.getFocused(true);

    filtered = workTypes.filter(type => {
        return type.typeString.toUpperCase().includes(focusedOption.value.toUpperCase());
    });

    await interaction.respond(
        filtered.map(type => ({ name: type.typeString, value: type.typeString }))
    );
}

handleSeriesAutoComplete = async (interaction) => {

    // Load the data from file
    let filename = "winner-and-event-data.json";
    let dataFile = require("./" + filename);
    if (dataFile[interaction.guild] == null) {
        dataFile[interaction.guild] = {};
    }

    let serverData = dataFile[interaction.guild.id];

    const focusedOption = interaction.options.getFocused(true);
    if (focusedOption.name === 'series') {

        let seriesNames = [];
        for (let eventSeries of serverData.eventSeries) {
            seriesNames.push(eventSeries.name);
        }
        seriesNames.sort();

        // Add voice events to the series autocomplete
        seriesNames.push("Voice Events");

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
                let eventNames = [];

                // Find the series we want
                let eventSeries = serverData.eventSeries.find(series => series.name.toUpperCase() == seriesName.toUpperCase());

                let showFutureEvents = true;
                if (eventSeries.hideFutureEvents) {
                    let callingMember = await interaction.guild.members.fetch(interaction.user.id);
                    showFutureEvents = !!eventSeries.organizers.find(organizer => (organizer.id == callingMember.id));
                }

                for (let event of eventSeries.events) {

                    if (!showFutureEvents) {
                        // If we're not showing future events, check if this is one
                        let now = dayjs();
                        let eventTime = dayjs(event.date);
                        if (!now.isBefore(eventTime)) {
                            eventNames.push(event.name);
                        }
                    }
                    else {
                        eventNames.push(event.name);
                    }
                }
                eventNames.sort();

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
    handleSeriesAutoComplete
}
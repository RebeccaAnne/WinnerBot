const dayjs = require('dayjs');
var fs = require("fs");
const { GuildScheduledEventManager } = require('discord.js');
const { winnerNameList, getListSeparator } = require('./utils');


function formatEventDate(event) {
    let displayDate = "";
    let eventDayJs = dayjs(event.date);

    if (event.allDayEvent) {
        // For all day events display the fixed calendar date
        displayDate = eventDayJs.format("MMMM D, YYYY");
    }
    else {
        // For non-all day events, format as a hammertime
        displayDate = "<t:" + eventDayJs.unix() + ":f>";
    }

    return displayDate;
}

async function getEventsDisplyString(guild, eventSeriesArray, showAll, includeVoiceEvents) {

    // Sort the events of each series
    for (let eventSeries of eventSeriesArray) {
        eventSeries.events.sort((a, b) => {
            let aDate = dayjs(a.date);
            let bDate = dayjs(b.date);

            if (aDate.isBefore(bDate)) { return -1; }
            else if (bDate.isBefore(aDate)) { return 1; }
            else { return 0; }
        });
    }

    // Sort the series by ealiest event
    eventSeriesArray.sort((a, b) => {

        // If one of the series doesn't have any events, sort it first
        if (a.events.length == 0 || b.events.length == 0) {
            if (b.events.length == a.events.length) { return 0; }
            else if (a.events.length == 0) { return -1; }
            else { return 1; }
        }

        let aDate = dayjs(a.events[0].date);
        let bDate = dayjs(b.events[0].date);

        if (aDate.isBefore(bDate)) { return -1; }
        else if (bDate.isBefore(aDate)) { return 1; }
        else { return 0; }
    })

    let eventListString = "";
    for (let eventSeries of eventSeriesArray) {

        if (eventSeries.events.length > 0 || showAll) {

            eventListString += "**" + eventSeries.name + "**\n";
            eventListString += "*(organized by " + eventSeries.organizers[0].username + "";
            if (eventSeries.eventThread) {
                eventListString += " in <#" + eventSeries.eventThread + ">"
            }
            eventListString += ")*\n"

            // Only show the first three upcoming events for this series unless the caller passed showAll 
            let maxEventsToShow = showAll ? eventSeries.events.length : 3;
            for (let i = 0; i < maxEventsToShow && i < eventSeries.events.length; i++) {
                let event = eventSeries.events[i];

                // Add event title to the string
                eventListString += "- **" + event.name + "**: ";

                // Add formatted date to the string
                eventListString += formatEventDate(event);

                if (showAll && event.reminders.length != 0) {
                    // If showAll is set, also show the reminders for each event
                    eventListString += ", Reminders:\n";

                    for (const reminder of event.reminders) {
                        eventListString += " - <t:" + dayjs(reminder.date).unix() + ":f> : <#" + reminder.channel + ">" + "\n";
                    }
                }
                else {
                    eventListString += "\n";
                }
            }

            // If there are more events than we showed, display the count of non-displayed events
            if (eventSeries.events.length > maxEventsToShow) {
                eventListString += "*(" + (eventSeries.events.length - 3) + " more scheduled event(s))*\n"
            }
        }
        eventListString += "\n";
    }

    if (includeVoiceEvents) {
        const eventManager = new GuildScheduledEventManager(guild);

        let scheduledEvents = await eventManager.fetch();
        if (scheduledEvents.size > 0) {
            eventListString += "**Voice Events**\n";

            let eventArrray = Array.from(scheduledEvents.values());

            eventArrray.sort((a, b) => {
                let aDate = dayjs(a.scheduledStartAt);
                let bDate = dayjs(b.scheduledStartAt);

                if (aDate.isBefore(bDate)) { return -1; }
                else if (bDate.isBefore(aDate)) { return 1; }
                else { return 0; }
            })

            for (let scheduledEvent of eventArrray) {
                eventListString += "- **" + scheduledEvent.name + "**: ";

                eventListString += "<t:" + dayjs(scheduledEvent.scheduledStartAt).unix() + ":f>\n";
            }
        }
    }

    return eventListString;
}

module.exports = { getEventsDisplyString, formatEventDate }

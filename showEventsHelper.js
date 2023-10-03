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

        if (event.durationInHours) {
            let eventEndTime = eventDayJs.add(event.durationInHours, "hour")
            displayDate += " *(ends <t:" + eventEndTime.unix() + ":f>)*";
        }
    }

    return displayDate;
}

function getEventsDisplyStringForSeries(eventSeries, showAll, maxEvents) {

    let eventListString = "";

    // Sort the events by date
    eventSeries.events.sort((a, b) => {

        // For all day events, sort by the earliest time this event starts anywhere (UTC+14)
        // If it's not alldat, the date will already be the full date time
        let aDate = a.allDayEvent ? dayjs.tz(a.date, "Pacific/Kiritimati") : dayjs(a.date);
        let bDate = b.allDayEvent ? dayjs.tz(b.date, "Pacific/Kiritimati") : dayjs(b.date);

        if (aDate.isBefore(bDate)) { return -1; }
        else if (bDate.isBefore(aDate)) { return 1; }
        else { return 0; }
    });

    let now = dayjs();

    // Don't show more than maxEvents upcoming events for this series unless the caller passed showAll 
    let maxEventsToShow = showAll ? eventSeries.events.length : maxEvents;
    let displayedEventCount = 0;
    while (displayedEventCount < maxEventsToShow &&
        displayedEventCount < eventSeries.events.length) {

        let event = eventSeries.events[displayedEventCount];

        if (eventSeries.hideFutureEvents && !showAll) {

            // If we're hiding future events, check if this one has started yet
            let eventStartTime;
            if (event.allDayEvent) {

                // We need to figure out if this day has started *anywhere*.
                // Use Pacific/Kiritimati (UTC+14) for our ealiest timezone
                eventStartTime = dayjs.tz(event.date, "Pacific/Kiritimati");
            }
            else {
                eventStartTime = dayjs(event.date);
            }

            if (eventStartTime.isAfter(now)) {
                // If we've hit an event that starts after now we can break out of the loop. 
                // The events are sorted and all subsequent events will be later.
                break;
            }
        }

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
        displayedEventCount++;
    }

    // If there are more events than we showed, display the count of non-displayed events
    if (displayedEventCount < eventSeries.events.length) {
        if (displayedEventCount == 0) {
            eventListString += " - **" + eventSeries.events.length + " hidden future event";
            eventListString += eventSeries.events.length > 1 ? "s" : "";
            eventListString += "**\n";
        }
        else {
            let addtionalEventCount = eventSeries.events.length - displayedEventCount
            eventListString += "*(" + addtionalEventCount + " more scheduled event"
            eventListString += addtionalEventCount > 1 ? "s" : "";
            eventListString += ")*\n"
        }
    }

    return eventListString;
}

async function getEventsDisplyStringForVoice(guild, scheduledEvents) {

    if (!scheduledEvents) {
        const eventManager = new GuildScheduledEventManager(guild);
        scheduledEvents = await eventManager.fetch();
    }

    let eventArrray = Array.from(scheduledEvents.values());
    eventArrray.sort((a, b) => {
        let aDate = dayjs(a.scheduledStartAt);
        let bDate = dayjs(b.scheduledStartAt);

        if (aDate.isBefore(bDate)) { return -1; }
        else if (bDate.isBefore(aDate)) { return 1; }
        else { return 0; }
    })

    let eventListString = "";
    for (let scheduledEvent of eventArrray) {
        eventListString += "- **" + scheduledEvent.name + "**: ";

        eventListString += "<t:" + dayjs(scheduledEvent.scheduledStartAt).unix() + ":f>\n";
    }

    return eventListString;
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

            seriesEventString = getEventsDisplyStringForSeries(eventSeries, showAll, 3);

            if (seriesEventString) {
                eventListString += "**" + eventSeries.name + "**\n";
                eventListString += "*(organized by " + eventSeries.organizers[0].username + "";
                if (eventSeries.eventThread) {
                    eventListString += " in <#" + eventSeries.eventThread + ">"
                }
                eventListString += ")*\n"

                // Get the list of events. Show a max of three per series unless the caller passed showAll.
                eventListString += seriesEventString;
                eventListString += "\n";
            }
        }
    }

    if (includeVoiceEvents) {
        const eventManager = new GuildScheduledEventManager(guild);

        let scheduledEvents = await eventManager.fetch();
        if (scheduledEvents.size > 0) {
            eventListString += "**Voice Events**\n";
            eventListString += await getEventsDisplyStringForVoice(guild, scheduledEvents);
        }
    }

    return eventListString;
}

module.exports = { getEventsDisplyStringForVoice, getEventsDisplyStringForSeries, getEventsDisplyString, formatEventDate }

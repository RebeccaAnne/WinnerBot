const { CronJob } = require('cron');
const fs = require('node:fs');
const { EmbedBuilder } = require('discord.js');
const { formatEventDate } = require('./showEventsHelper')
const { declareTerror } = require('./addWinnersHelper')

const dayjs = require('dayjs');
var utc = require('dayjs/plugin/utc')
var timezone = require('dayjs/plugin/timezone')

dayjs.extend(utc)
dayjs.extend(timezone)


winnerExpirationCheck = async (guild, serverConfig) => {

    let winnerListFile = require("./winner-and-event-data.json");
    let winnerList = winnerListFile[serverConfig.guildId];

    console.log(dayjs().format() + " Checking for expired winners in " + serverConfig.guildId)

    winnerList.winners.forEach(winner => {
        winner.wins = winner.wins.filter(win => {
            let winDate = dayjs(win.date);
            let dateCutoff = dayjs().subtract(serverConfig.winDurationInDays, "day");

            // Add an extra hour of buffer time
            dateCutoff = dateCutoff.subtract(1, "hour")

            if (!winDate.isAfter(dateCutoff)) {
                console.log(winner.username + "'s win from" + winDate.format() + "has expired");
                return false;
            }
            else {
                return true;
            }
        }
        );
    })

    // Keep track of the filtered members so we can remove their roles. 
    // Don't try to do this in the filter because async and filter don't play nicely together
    let filteredMembers = [];
    winnerList.winners = await winnerList.winners.filter(winner => {

        if (winner.wins.length == 0) {
            console.log("All of " + winner.username + "'s wins have expired");
            filteredMembers.push(winner.id);
            return false;
        }
        else {
            return true;
        }
    });

    // Remove all filtered members from the winner role
    for (const filteredMember of filteredMembers) {
        let winnerMember = await guild.members.fetch(filteredMember);
        await winnerMember.roles.remove(serverConfig.winnerRoleId);
    }

    fs.writeFileSync("winner-and-event-data.json", JSON.stringify(winnerListFile), () => { });
}

scheduleWinExpirationCheck = async (win, guild, serverConfig) => {
    try {

        let winDate = dayjs(win.date);
        let expireDate = winDate.add(serverConfig.winDurationInDays, "day");

        // Add an extra hour of buffer
        expireDate = expireDate.add(1, "hour");

        console.log("Scheduling expire check at " + expireDate.format() + " for " + win.reason);

        let cronTime =
            expireDate.second() + " " +
            expireDate.minute() + " " +
            expireDate.hour() + " " +
            expireDate.date() + " " +
            expireDate.month() +
            " *";  // Day of week

        const job = new CronJob(cronTime, async function () {
            winnerExpirationCheck(guild, serverConfig);
            this.stop(); // Run this once and then stop
        }, null, true);

    }
    catch (error) {
        console.log(error);
    }
}

scheduleWinnerExpirationCheck = async (winner, guild, serverConfig) => {

    console.log("Scheduling expire checks for " + winner.username + " in " + serverConfig.guildId);

    for (const win of winner.wins) {
        await scheduleWinExpirationCheck(win, guild, serverConfig);
    }
}

popReminder = async (sereverConfig, guild, seriesName, eventName, reminder) => {
    let channel = await guild.channels.fetch(reminder.channel);

    let filename = "winner-and-event-data.json";
    let dataFile = require("./" + filename);
    let serverData = dataFile[guild.id];

    let series = serverData.eventSeries.find(series => series.name == seriesName);
    let event = series.events.find(event => event.name == eventName);

    let reminderString = "### " + event.name + "\n" + formatEventDate(event);;

    if (event.description) {
        reminderString += "\n\n" + event.description;
    }

    await channel.send({
        embeds: [new EmbedBuilder()
            .setDescription(reminderString)
            .setTitle("Upcoming Event Reminder for " + series.name)
            .setColor(0xff)]
    });

    // Filter out this reminder (and any other reminders that may be obsolete)
    event.reminders = event.reminders.filter(reminder => {
        let reminderDate = dayjs(reminder.date);
        let now = dayjs();

        if (reminderDate.isBefore(now)) {
            return false;
        }
        else {
            return true;
        }
    });

    fs.writeFileSync(filename, JSON.stringify(dataFile), () => { });
}

scheduleReminder = async (serverConfig, guild, series, event, reminder) => {

    try {
        let reminderTimeDayJs = dayjs(reminder.date);
        console.log("Scheduling reminder for " + reminderTimeDayJs.format() + " for " + series.name + ": " + event.name);

        let cronTime =
            reminderTimeDayJs.second() + " " +
            reminderTimeDayJs.minute() + " " +
            reminderTimeDayJs.hour() + " " +
            reminderTimeDayJs.date() + " " +
            reminderTimeDayJs.month() +
            " *";  // Day of week

        const job = new CronJob(cronTime, async function () {
            popReminder(serverConfig, guild, series.name, event.name, reminder);
            this.stop(); // Run this once and then stop
        }, null, true);
    }
    catch (error) {
        console.log(error);
    }
}

getEventExpireTime = (event) => {
    let eventExpireTime;
    if (!event.allDayEvent) {
        // Expire one hour after the event time
        eventExpireTime = dayjs(event.date);
        eventExpireTime = eventExpireTime.add(1, "hour")
    }
    else {
        // If this is an all day event, expire it after the day has finished in UTC-12 (which for
        // some reason has the sign reversed in it's identifier)
        eventExpireTime = dayjs.tz(event.date, "Etc/GMT+12");
        eventExpireTime = eventExpireTime.add(1, "day")

        // Convert to local time for cron jobs
        eventExpireTime = eventExpireTime.tz();
    }
    return eventExpireTime;
}

eventExpirationCheck = async (guild, serverConfig) => {

    let dataFile = require("./winner-and-event-data.json");
    serverData = dataFile[serverConfig.guildId];

    console.log(dayjs().format() + " Checking for expired events in " + serverConfig.guildId)

    if (!serverData.eventSeries) { serverData.eventSeries = [] }

    for (const series of serverData.eventSeries) {
        series.events = series.events.filter(event => {

            let eventExpireTime = getEventExpireTime(event);
            let now = dayjs();

            if (now.isAfter(eventExpireTime)) {
                removeEventFromToCache(guild.id, series.name, event.name);
                console.log(
                    event.name + " in the " + series.name + " series, scheduled for " + dayjs(event.date).format() + " has expired");
                return false;
            }
            else {
                return true;
            }
        }
        );
    }
    fs.writeFileSync("winner-and-event-data.json", JSON.stringify(dataFile), () => { });
}

scheduleEventTimers = async (serverConfig, guild, series, event) => {

    console.log("Scheduling timers for " + event.name)

    let eventExpireTime = getEventExpireTime(event);

    console.log("Scheduling event expiration at " + eventExpireTime.format());

    let cronTime =
        eventExpireTime.second() + " " +
        eventExpireTime.minute() + " " +
        eventExpireTime.hour() + " " +
        eventExpireTime.date() + " " +
        eventExpireTime.month() +
        " *";  // Day of week

    const job = new CronJob(cronTime, async function () {
        eventExpirationCheck(guild, serverConfig);
        this.stop(); // Run this once and then stop
    }, null, true);

    for (const reminder of event.reminders) {
        scheduleReminder(serverConfig, guild, series, event, reminder)
    }
}

scheduleSeriesTimers = async (serverConfig, guild, series) => {

    console.log("Scheduling timers for " + series.name)
    for (const event of series.events) {
        await scheduleEventTimers(serverConfig, guild, series, event);
    }
}

triggerNMinusOne = async (guild, serverConfig) => {
    let channel = await guild.channels.fetch(serverConfig.fanworksAnnouncementChannel);

    console.log("N-1 triggered for " + serverConfig.guildId + " at " + dayjs().format());

    let serverData = {}
    await getMutex().runExclusive(async () => {

        // Load the winner array from file
        let dataFile = require("./winner-and-event-data.json");
        serverData = dataFile[serverConfig.guildId];

        // Decrease the terror threshold and update the last n-1 date
        serverData.currentTerrorThreshold--;
        serverData.lastNMinusOne = dayjs().format();

        // Check if decreasing the terror threshold has triggered a terror
        let terrorTriggered = serverData.winners.length >= serverData.currentTerrorThreshold;

        if (!terrorTriggered) {

            // Send an announcement to the channel regarding n-1
            await channel.send({
                embeds: [new EmbedBuilder()
                    .setDescription("The so called “Terrors of Astandalas” have not been seen since <t:"
                        + dayjs(serverData.lastTerrorDate).unix()
                        + ":D>. Sources in the palace say that the imperial guard has become complacent, and it would now take only "
                        + serverData.currentTerrorThreshold
                        + " Winners of the Discord to terrorize the empire.")
                    .setTitle("All Quiet in Astandalas")
                    .setFooter({
                        text: "There are currently " + serverData.winners.length + " out of the " + serverData.currentTerrorThreshold + " winners needed for Terror of Astandalas"
                    })
                    .setColor(0xd81b0e)]
            });
        }
        else {

            console.log("N-1 has triggered a terror");

            // Send an announcement to the channel indicating that n-1 has triggered a terror
            await channel.send({
                embeds: [new EmbedBuilder()
                    .setDescription("The so called “Terrors of Astandalas” had not previously been seen since <t:"
                        + dayjs(serverData.lastTerrorDate).unix()
                        + ":D>. Sources in the palace say that the imperial guard became complacent, allowing only "
                        + serverData.currentTerrorThreshold
                        + " Winners of the Discord to terrorize the empire.")
                    .setTitle("The Terrors of Astandalas Have Returned!")
                    .setColor(0xd81b0e)]
            });

            // Trigger the terror
            await declareTerror(guild, serverConfig, serverData);
        }

        // Write the updated data back to file
        fs.writeFileSync("winner-and-event-data.json", JSON.stringify(dataFile), () => { });
    });

    // Schedule the next n-1 check
    await scheduleNMinusOneCheck(guild, serverConfig);
}

getNMinusOneTime = (serverConfig) => {

    let dataFile = require("./winner-and-event-data.json");
    serverData = dataFile[serverConfig.guildId];

    let nextNMinusOneTime;
    if (serverConfig.nMinusOneThreshold) {
        if (serverData.lastNMinusOne) {
            // If we've already had an n-1, the next one should be one unit (month) later
            nextNMinusOneTime = dayjs(serverData.lastNMinusOne);
            nextNMinusOneTime = nextNMinusOneTime.add(1, serverConfig.nMinusOneThresholdUnits)
        }
        else {
            // If we haven't had an n-1, the next one should be nMinusOneThreshold units (months) after the most recent terror
            nextNMinusOneTime = dayjs(serverData.lastTerrorDate);
            nextNMinusOneTime = nextNMinusOneTime.add(serverConfig.nMinusOneThreshold, serverConfig.nMinusOneThresholdUnits)

            // Add an extra hour of buffer
            nextNMinusOneTime = nextNMinusOneTime.add(1, "hour");
        }
    }
    return nextNMinusOneTime;
}

nMinusOneCheck = async (guild, serverConfig) => {
    let dataFile = require("./winner-and-event-data.json");
    serverData = dataFile[serverConfig.guildId];

    console.log("Checking n-1 for " + serverConfig.guildId);
    nMinusOneTime = getNMinusOneTime(serverConfig);

    if (nMinusOneTime) {
        now = dayjs();

        // If we're past the nMinusOneTime and our current terror threshold is higher than the base, trigger n-1
        if (now.isAfter(nMinusOneTime) &&
            serverData.currentTerrorThreshold > serverConfig.baseTerrorThreshold) {
            await triggerNMinusOne(guild, serverConfig);
            return true;
        }
    }

    return false;
}

scheduleNMinusOneCheck = (guild, serverConfig) => {

    let dataFile = require("./winner-and-event-data.json");
    let serverData = dataFile[serverConfig.guildId];

    // We only need to schedule an n-1 check if we're above the baseTerrorThreshold
    if (serverConfig.nMinusOneThreshold &&
        serverData.currentTerrorThreshold > serverConfig.baseTerrorThreshold) {

        // Get the time and schedule a cron job
        let nMinusOneTime = getNMinusOneTime(serverConfig);

        console.log("Scheduling n-1 check for " + serverConfig.guildId + " at " + nMinusOneTime.format());

        let cronTime =
            nMinusOneTime.second() + " " +
            nMinusOneTime.minute() + " " +
            nMinusOneTime.hour() + " " +
            nMinusOneTime.date() + " " +
            nMinusOneTime.month() +
            " *";  // Day of week

        const job = new CronJob(cronTime, async function () {
            nMinusOneCheck(guild, serverConfig);
            this.stop(); // Run this once and then stop
        }, null, true);
    }
}

module.exports = { scheduleNMinusOneCheck, scheduleWinnerExpirationCheck, scheduleWinExpirationCheck, scheduleSeriesTimers, winnerExpirationCheck, nMinusOneCheck }

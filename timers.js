const dayjs = require('dayjs');
const { CronJob } = require('cron');
const fs = require('node:fs');
const { EmbedBuilder } = require('discord.js');


winnerExpirationCheck = async (guild, serverConfig) => {

    let winnerListFile = require("./winner-and-event-data.json");
    winnerList = winnerListFile[serverConfig.guildId];

    console.log(dayjs().format("YYYY-M-D h:mm:ss a") + " Checking for expired winners in " + serverConfig.guildId)

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

scheduleWinnerExpirationCheck = async (winner, guild, serverConfig) => {

    try {
        winner.wins.forEach(win => {

            let winDate = dayjs(win.date);
            let expireDate = winDate.add(serverConfig.winDurationInDays, "day");

            // Add an extra hour of buffer
            expireDate = expireDate.add(1, "hour");

            console.log("Scheduling expire check at " + expireDate.format("YYYY-M-D h:mm:ss a") + " for " + winner.username);

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
        })
    }
    catch (error) {
        console.log(error);
    }
}

popReminder = async (sereverConfig, guild, seriesName, eventName, reminder) => {
    let channel = await guild.channels.fetch(reminder.channel);

    let filename = "winner-and-event-data.json";
    let dataFile = require("./" + filename);
    let serverData = dataFile[guild.id];

    let series = serverData.eventSeries.find(series => series.name == seriesName);
    let event = series.events.find(event => event.name == eventName);

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

    let reminderString = displayDate + ": " + event.name;

    await channel.send({
        embeds: [new EmbedBuilder()
            .setDescription(reminderString)
            .setTitle("Upcoming Event Reminder for " + series.name)]
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
        console.log("Scheduling reminder for " + reminderTimeDayJs.format("YYYY-M-D h:mm:ss a") + " for " + series.name + ": " + event.name);

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

module.exports = { scheduleWinnerExpirationCheck, winnerExpirationCheck }

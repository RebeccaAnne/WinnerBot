const dayjs = require('dayjs');
const { CronJob } = require('cron');
const fs = require('node:fs');

expirationCheck = async (guild, serverConfig) => {

    let winnerListFile = require("./winner-arrays.json");
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
    fs.writeFileSync("winner-arrays.json", JSON.stringify(winnerListFile), () => { });
}

scheduleExpirationCheck = async (winner, guild, serverConfig) => {

    try {
        winner.wins.forEach(win => {

            let winDate = dayjs(win.date);
            let expireDate = winDate.add(serverConfig.winDurationInDays, "day");
            
            // Add an extra hour of buffer
            expireDate = expireDate.add(1, "hour");

            console.log("Scheduling expire check for " + expireDate.format("YYYY-M-D h:mm:ss a") + " for " + winner.username);

            let cronTime =
                expireDate.second() + " " +
                expireDate.minute() + " " +
                expireDate.hour() + " " +
                expireDate.date() + " " +
                expireDate.month() +
                " *";  // Day of week

            const job = new CronJob(cronTime, async function () {
                expirationCheck(guild, serverConfig);
                this.stop(); // Run this once and then stop
            }, null, true);
        })
    }
    catch (error) {
        console.log(error);
    }
}

module.exports.scheduleExpirationCheck = scheduleExpirationCheck;
module.exports.expirationCheck = expirationCheck;

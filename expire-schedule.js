const dayjs = require('dayjs');
const { CronJob } = require('cron');

module.exports = {

    expirationCheck: async (serverConfig) => {

        let winnerListFile = require("./winner-arrays.json");
        winnerList = winnerListFile[serverConfig.guildId];

        console.log(dayjs().format("YYYY-M-D h:mm") + " Checking for expired winners in " + serverConfig.guildId)

        // Keep track of the filtered members so we can remove their roles. 
        // Don't try to do this in the filter because async and filter don't play nicely together
        let filteredMembers = [];
        winnerList.winners = await winnerList.winners.filter(winner => {
            let winDate = dayjs(winner.date);
            let dateCutoff = dayjs().subtract(serverConfig.winDurationInDays, "day");

            if (!winDate.isAfter(dateCutoff)) {
                console.log(winner.username + "'s win has expired");
                filteredMembers.push(winner.id);
                return false;
            }
            else {
                return true;
            }
        });

        // Remove all filtered members from the winner role
        let guild = await client.guilds.fetch(serverConfig.guildId);
        for (const filteredMember of filteredMembers) {
            let winnerMember = await guild.members.fetch(filteredMember);
            await winnerMember.roles.remove(serverConfig.winnerRoleId);
        }
        fs.writeFileSync("winner-arrays.json", JSON.stringify(winnerListFile), () => { });
    },

    scheduleExpirationCheck: async (winner, serverConfig) => {

        let winDate = dayjs(winner.date);
        let expireDate = winDate.add(serverConfig.winDurationInDays, "day");

        console.log("Scheduling expire check for " + expireDate.format("YYYY-M-D h:mm") + " for " + winner.username);

        let cronTime =
            "0 " + // Seconds
            expireDate.minute() + " " +
            expireDate.hour() + " " +
            expireDate.date() + " " +
            expireDate.month() +
            " *"; // Day of week

        const job = new CronJob(cronTime, async function () {
            expirationCheck(serverConfig);
        }, null, true);
    }
}
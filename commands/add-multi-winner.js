var fs = require("fs");
const { SlashCommandBuilder, UserSelectMenuBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, EmbedBuilder } = require('discord.js');
const dayjs = require('dayjs');
const { formatWinnerReason, getListSeparator, modjsPermissionChannelCheck } = require('../utils');
const { addWinners } = require("../addWinnersHelper");

module.exports = {
	data: new SlashCommandBuilder()
		.setName('add-multi-winner')
		.setDescription('Adds winners for a fanwork with multiple contributors')
		.addStringOption(option =>
			option.setName('reason')
				.setDescription('The reason for winning')
				.setRequired(true))
		.addStringOption(option =>
			option.setName('link')
				.setDescription('Link to the winning work. (ao3, message link, etc.)')
				.setRequired(true))
		.addStringOption(option =>
			option.setName('work-type')
				.setDescription('What type of fanwork this is. Choose from auto-complete options or type a custom work type.')
				.setAutocomplete(true)
				.setRequired(true))
		.addStringOption(option =>
			option.setName('win-date-time')
				.setDescription('Optional date/time (hammertime) for this win. Defaults to now.')),
	async execute(commandInteraction) {

		let permissionErrorMessage = await modjsPermissionChannelCheck(commandInteraction);
		if (permissionErrorMessage) {
			await commandInteraction.reply({
				content: permissionErrorMessage, ephemeral: true
			});
			return;
		}

		let guild = commandInteraction.guild;
		let serverConfig = require("../data/server-config-" + guild.id + ".json");

		let reason = commandInteraction.options.getString('reason');
		let link = commandInteraction.options.getString('link');
		let workType = interaction.options.getString('work-type');
		let dateTimeString = commandInteraction.options.getString('win-date-time');

		let dateTime = null;
		if (dateTimeString) {
			dateTime = tryParseHammerTime(dateTimeString);
			if (!dateTime) {
				await interaction.reply({
					content: "Winner not added!\nwin-date-time, if present, must be a valid HammerTime (see https://hammertime.cyou/)",
					ephemeral: true
				});
				return;
			}
			else {
				let dateCutoff = dayjs().subtract(7, 'day');
				if (dayjs(dateTime).isBefore(dateCutoff)) {
					await interaction.reply({
						content: "Winner not added!\nThis win has already expired",
						ephemeral: true
					});
					return;
				}
			}
		}
		// This reply will be seen by everyone in the thread while the caller is interacting with the UI
		await commandInteraction.reply({
			embeds: [new EmbedBuilder()
				.setDescription("Multiple Winners are being added for " +
					formatWinnerReason({ reason: reason, link: link, workType: workType }) + "...")]
		});

		const userSelect = new UserSelectMenuBuilder()
			.setCustomId('users')
			.setPlaceholder('Select winners')
			.setMinValues(1)
			.setMaxValues(20);

		const selectorRow = new ActionRowBuilder()
			.addComponents(userSelect);

		const confirm = new ButtonBuilder()
			.setCustomId('confirm')
			.setLabel('Add Winners')
			.setStyle(ButtonStyle.Primary)
			.setDisabled(true);

		const cancel = new ButtonBuilder()
			.setCustomId('cancel')
			.setLabel('Cancel')
			.setStyle(ButtonStyle.Secondary);

		const buttonRow = new ActionRowBuilder()
			.addComponents(cancel, confirm);

		// This follow up with a picker and buttons will be seen by the original caller only (ephemeral), and will allow them to 
		// select the winners
		let ephemeralComponentFollowUp = await commandInteraction.followUp({
			content: `Select the users who have won the discord for: ${reason}`,
			components: [selectorRow, buttonRow],
			ephemeral: true
		});

		// Response collector for the User Select
		let firstSelection = true;
		let winners = [];
		const selectCollector = ephemeralComponentFollowUp.createMessageComponentCollector({ componentType: ComponentType.UserSelect, time: 3_600_000 });

		selectCollector.on('collect', async selectInteration => {

			// Populate the Winner Collection with the selected items
			winners.length = 0;
			for (const winner of selectInteration.values) {
				// Fetch the winner as a guild member
				let member = await guild.members.fetch(winner);
				winners.push(member);
			}

			// Update the response to enable the button
			if (firstSelection) {
				confirm.setDisabled(false);
				selectInteration.update({
					content: `Select the users who have won the discord for: ${reason}`,
					components: [selectorRow, buttonRow],
				});
			}
		});

		// Response collector for the Buttons
		const buttonCollector = ephemeralComponentFollowUp.createMessageComponentCollector({ componentType: ComponentType.Button, time: 3_600_000 });
		buttonCollector.on('collect', async buttonInteration => {

			let buttonInteractionText = "";
			let commandInteractionText = "";
			if (buttonInteration.customId === 'confirm') {

				commandInteractionText = "**Winner(s) added:**\n";
				commandInteractionText += await addWinners(guild, serverConfig, winners, reason, link, workType, dateTime ? dayjs(dateTime) : null);

				buttonInteractionText = "Winners successfully added!";
			}
			else if (buttonInteration.customId == 'cancel') {
				buttonInteractionText = "add-multi-win cancelled";
				commandInteractionText = "add-multi-win cancelled";
			}

			await buttonInteration.update({ content: buttonInteractionText, components: [] })

			// Update the original reply with the response message so everyone can see it
			await commandInteraction.editReply({
				content: null,
				embeds: [new EmbedBuilder()
					.setDescription(commandInteractionText)]
			});
		});
	},

	async autocomplete(interaction) {
		handleWorkTypeAutoComplete(interaction);
	}
};

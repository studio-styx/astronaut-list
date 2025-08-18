import { createCommand } from "#base";
import { res } from "#functions";
import { settings } from "#settings";
import { ApplicationCommandOptionType, ApplicationCommandType } from "discord.js";
import permissionAdd from "./permissions/permissionAdd.js";
import permissionRemove from "./permissions/permissionRemove.js";
import permissionsList from "./permissions/permissionsList.js";

createCommand({
    name: "permissions",
    description: "gerenciar permissões",
    type: ApplicationCommandType.ChatInput,
    options: [
        {
            name: "add",
            description: "adicionar permissão",
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: "user",
                    description: "usuário",
                    type: ApplicationCommandOptionType.User,
                    required: true
                },
                {
                    name: "permission",
                    description: "permissão",
                    type: ApplicationCommandOptionType.String,
                    required: true,
                    autocomplete: true
                }
            ]
        },
        {
            name: "remove",
            description: "remover permissão",
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: "user",
                    description: "usuário",
                    type: ApplicationCommandOptionType.User,
                    required: true
                }
            ]
        },
        {
            name: "list",
            description: "listar permissões",
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: "user",
                    description: "usuário",
                    type: ApplicationCommandOptionType.User,
                    required: false
                },
            ]
        }
    ],
    async autocomplete(interaction) {
        const { options } = interaction;
        const focusedOption = options.getFocused(true);
        const subCommand = options.getSubcommand();

        switch (subCommand) {
            case "add": {
                const permissions = [
                    'CreateInstantInvite',
                    'KickMembers',
                    'BanMembers', 
                    'Administrator',
                    'ManageChannels',
                    'ManageGuild',
                    'AddReactions',
                    'ViewAuditLog',
                    'PrioritySpeaker',
                    'Stream',
                    'ViewChannel',
                    'SendMessages',
                    'SendTTSMessages',
                    'ManageMessages',
                    'EmbedLinks',
                    'AttachFiles',
                    'ReadMessageHistory',
                    'MentionEveryone',
                    'UseExternalEmojis',
                    'ViewGuildInsights',
                    'Connect',
                    'Speak',
                    'MuteMembers',
                    'DeafenMembers',
                    'MoveMembers',
                    'UseVAD',
                    'ChangeNickname',
                    'ManageNicknames',
                    'ManageRoles',
                    'ManageWebhooks',
                    'ManageEmojisAndStickers',
                    'UseApplicationCommands',
                    'RequestToSpeak',
                    'ManageEvents',
                    'ManageThreads',
                    'CreatePublicThreads',
                    'CreatePrivateThreads',
                    'UseExternalStickers',
                    'SendMessagesInThreads',
                    'UseEmbeddedActivities',
                    'ModerateMembers',
                    'ViewCreatorMonetizationAnalytics',
                    'UseSoundboard',
                    'UseExternalSounds',
                    'SendVoiceMessages'
                ];

                const filtered = permissions.filter(p => 
                    p.toLowerCase().includes(focusedOption.value.toLowerCase())
                );

                return interaction.respond(
                    filtered.slice(0, 25).map(p => ({ name: p, value: p }))
                );
            }
        };
    },
    async run(interaction){
        const { guild } = interaction;

        if (guild.id !== settings.guild.sandboxId) {
            interaction.reply(res.danger("Este comando só pode ser usado em um servidor isolado"));
            return;
        };

        switch (interaction.options.getSubcommand()) {
            case "add":
                permissionAdd(interaction);
                break;
            case "remove":
                permissionRemove(interaction);
                break;
            case "list":
                permissionsList(interaction);
                break;
        };
    }
});
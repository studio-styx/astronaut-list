import { createResponder, ResponderType } from "#base";
import { res } from "#functions";
import { PermissionsBitField, userMention } from "discord.js";

createResponder({
    customId: "permissions/remove/:userId/*",
    types: [ResponderType.StringSelect], cache: "cached",
    async run(interaction, { userId }) {
        await interaction.deferReply();
        const { guild } = interaction;

        const user = await guild.members.fetch(userId);

        if (!user) {
            await interaction.reply(res.danger("Usuário não encontrado."));
            return;
        }

        const permission = interaction.values[0];

        const permissionBit = PermissionsBitField.Flags[permission as keyof typeof PermissionsBitField.Flags];


        try {
            const highestRole = user.roles.highest;
            const botHighestRole = guild.members.me?.roles.highest;

            if (!botHighestRole || !highestRole || botHighestRole.comparePositionTo(highestRole) <= 0) {
                await interaction.editReply("Não posso remover esta permissão deste usuário.");
                return;
            }

            await highestRole.edit({
                permissions: new PermissionsBitField(highestRole.permissions).remove(permissionBit),
            });

            await interaction.editReply(`Permissão \`${permission}\` removida de ${userMention(userId)}.`);
        } catch (error) {
            console.error("Erro ao remover permissão:", error);
            await interaction.editReply("Ocorreu um erro ao remover a permissão.");
            return;
        }
    },
});
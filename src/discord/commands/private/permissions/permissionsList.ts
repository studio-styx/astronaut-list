import { res } from "#functions"
import { settings } from "#settings";
import { createEmbed } from "@magicyan/discord";
import { ChatInputCommandInteraction, userMention } from "discord.js"

export default async function permissionsList(interaction: ChatInputCommandInteraction<"cached">) {
    const user = interaction.options.getUser("user");

    await interaction.deferReply();

    try {
        const userMember = user ? await interaction.guild.members.fetch(user.id) : interaction.member;

        const permissions = userMember.permissions.toArray();

        if (permissions.length === 0) {
            await interaction.editReply(res.danger(`${user ? userMention(user.id) : "Você"} não tem permissões.`));
            return;
        }

        const embed = createEmbed({
            title: `Permissões de ${user? user.displayName : "Você"}`,
            description: permissions.map((permission, index) => `${index + 1} - \`${permission}\``).join("\n"),
            color: settings.colors.success
        });

        await interaction.editReply({ embeds: [embed] });
        return;
    } catch (error) {
        console.error(error);
        await interaction.editReply(res.danger(`Não foi possível encontrar o usuário.`));
        return;
    }
}
import { res } from "#functions"
import { settings } from "#settings";
import { createEmbed, createRow } from "@magicyan/discord";
import { ChatInputCommandInteraction, StringSelectMenuBuilder, userMention } from "discord.js"

export default async function permissionRemove(interaction: ChatInputCommandInteraction<"cached">) {
    const user = interaction.options.getUser("user", true);

    const userMember = await interaction.guild.members.fetch(user.id);

    const permissions = userMember.permissions.toArray();

    if (permissions.length === 0) {
        await interaction.reply(res.danger(`${userMention(user.id)} não tem permissões.`));
        return;
    }

    const embed = createEmbed({
        title: `Permissões de ${user.displayName}`,
        description: permissions.map(permission => `\`${permission}\``).join("\n"),
        color: settings.colors.warning,
    })

    const rows = [
        createRow(
            new StringSelectMenuBuilder({
                customId: `permissions/remove/${user.id}/1`,
                placeholder: "Selecione uma permissão",
                options: permissions.slice(0, 25).map(permission => ({
                    label: permission,
                    value: permission,
                }))
            })
        )
    ]

    if (permissions.length > 25) {
        rows.push(
            createRow(
                new StringSelectMenuBuilder({
                    customId: `permissions/remove/${user.id}/2`,
                    placeholder: "Selecione uma permissão",
                    options: permissions.slice(25, 50).map(permission => ({
                        label: permission,
                        value: permission,
                    }))
                })
            )
        )
    }

    await interaction.reply({ embeds: [embed], components: rows });
    return;
}
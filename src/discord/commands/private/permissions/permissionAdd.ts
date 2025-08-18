import { res } from "#functions";
import { ChatInputCommandInteraction, PermissionFlagsBits, PermissionsBitField, userMention } from "discord.js";

export default async function permissionAdd(interaction: ChatInputCommandInteraction<"cached">) {
    const user = interaction.options.getUser("user", true);
    const permission = interaction.options.getString("permission", true);

    await interaction.deferReply();

    try {
        const userMember = await interaction.guild.members.fetch(user.id);
        const botMember = await interaction.guild.members.fetch(interaction.client.user.id);

        // Verifica se a permissão é válida
        if (!(permission in PermissionFlagsBits)) {
            await interaction.editReply(res.danger(`\`${permission}\` não é uma permissão válida.`));
            return;
        }

        const permissionBit = PermissionsBitField.Flags[permission as keyof typeof PermissionsBitField.Flags];

        // Verifica se o usuário já tem a permissão (via cargo ou permissão direta)
        if (userMember.permissions.has(permissionBit)) {
            await interaction.editReply(res.danger(`${userMention(user.id)} já tem a permissão \`${permission}\`.`));
            return;
        }

        // Verifica se o bot pode editar os cargos do usuário
        if (!botMember.permissions.has(PermissionFlagsBits.ManageRoles)) {
            await interaction.editReply(res.danger("Eu não tenho permissão para **gerenciar cargos**."));
            return;
        }

        // Pega o cargo mais alto do usuário que o bot PODE editar
        const editableRole = userMember.roles.cache
            .sort((a, b) => b.position - a.position)
            .find(role => role.position < botMember.roles.highest.position);

        if (!editableRole || editableRole.name === "@everyone") {
            const role = await interaction.guild.roles.create({
                name: user.username,
                permissions: [permissionBit],
            });

            await interaction.editReply(res.success(`Permissão \`${permission}\` adicionada ao cargo **[${role.name}]** de ${userMention(user.id)}.`));
            return;
        }

        // Adiciona a permissão ao cargo
        await editableRole.edit({
            permissions: new PermissionsBitField(editableRole.permissions).add(permissionBit),
        });

        const userRoles = Array.from(userMember.roles.cache.values()).filter(role => role.name !== "@everyone");

        if (userRoles.length > 1) {
            userRoles.forEach(async role => {
                if (role.name !== "@everyone" && role.name !== editableRole.name) {
                    await userMember.roles.remove(role);
                }
            })
            await userMember.roles.set(userRoles);
        }

        await interaction.editReply(res.success(`Permissão \`${permission}\` adicionada ao cargo **${editableRole.name}** de ${userMention(user.id)}.`));
    } catch (error) {
        console.error(error);
        await interaction.editReply(res.danger("Ocorreu um erro ao adicionar a permissão."));
    }
}
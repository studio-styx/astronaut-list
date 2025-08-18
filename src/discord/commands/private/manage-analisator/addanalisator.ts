import { prisma } from "#database";
import { res } from "#functions";
import { ChatInputCommandInteraction } from "discord.js";

export default async function addAnalisator(interaction: ChatInputCommandInteraction<"cached">) {
    if (interaction.user.id !== "1171963692984844401" && interaction.user.id !== "1314229932309745704") {
        interaction.editReply(res.danger("Você não tem permissão para usar este comando."));
        return;
    }

    const user = interaction.options.getUser("user", true);

    await interaction.deferReply();

    await prisma.user.upsert({
        where: { id: user.id },
        update: { isAvaliator: true },
        create: { id: user.id, isAvaliator: true }
    })

    interaction.editReply(res.success("Usuário adicionado como analisador."));
}
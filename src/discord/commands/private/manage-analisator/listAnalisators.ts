import { prisma } from "#database";
import { res } from "#functions";
import { ChatInputCommandInteraction } from "discord.js";

export default async function addAnalisator(interaction: ChatInputCommandInteraction<"cached">) {
    const analisators = await prisma.user.findMany({
        where: { isAvaliator: true }
    })

    const analisatorsList = analisators.map(analisator => `<@${analisator.id}>`).join("\n")

    interaction.reply(res.green(`Lista de analisadores:\n${analisatorsList}`));
}
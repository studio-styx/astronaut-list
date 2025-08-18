import { prisma } from "#database"
import { res } from "#functions"
import { ChatInputCommandInteraction } from "discord.js"

export default async function listBotErrors(interaction: ChatInputCommandInteraction<"cached">, type: "error" | "ortographic") {
    await interaction.deferReply()

    const user = await prisma.user.findUnique({
        where: {
            id: interaction.user.id
        }
    })

    if (!user?.analisingId) {
        interaction.editReply(res.danger("Você não está analisando nenhum bot"))
        return
    }

    const analyze = await prisma.analyze.findUnique({
        where: {
            id: user.analisingId,
        },
        include: {
            annotations: true
        }
    })

    if (!analyze) {
        await prisma.user.update({
            where: {
                id: interaction.user.id
            },
            data: {
                analisingId: null
            }
        })
        interaction.editReply(res.danger("Bot não encontrado ou já foi analisado"))
        return
    }

    const errors = analyze.annotations.filter((annotation) => annotation.type === type)

    if (errors.length === 0) {
        interaction.editReply(res.danger("Não há erros registrados"))
        return
    }

    interaction.editReply(res.success("Erros registrados:\n" + errors.map((error, index) => `${index + 1}. \`${error.text}\``).join("\n")))
}
import { prisma } from "#database"
import { res } from "#functions"
import { ChatInputCommandInteraction } from "discord.js"

export default async function clearBotErrors(interaction: ChatInputCommandInteraction<"cached">, type: "error" | "ortographic") {
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
            id: user.analisingId
        },
        include: {
            application: true
        }
    })

    if (!analyze?.application) {
        interaction.editReply(res.danger("Bot não encontrado ou já foi analisado"))
        await prisma.user.update({
            where: {
                id: interaction.user.id
            },
            data: {
                analisingId: null
            }
        })
        return
    }

    const [errors] = await prisma.$transaction([
        prisma.annotation.findMany({
            where: {
                analyzeId: analyze.id,
                type
            }
        }),
        prisma.annotation.deleteMany({
            where: {
                analyzeId: analyze.id,
                type
            }
        })
    ])

    if (errors.length === 0) {
        interaction.editReply(res.danger("Não há erros registrados"))
        return
    }

    interaction.editReply(res.success(`Foram removidos **${errors.length}** erros`))
}
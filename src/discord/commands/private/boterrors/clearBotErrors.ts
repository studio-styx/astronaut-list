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

    if (!user?.analising) {
        interaction.editReply(res.danger("Você não está analisando nenhum bot"))
        return
    }

    const bot = await prisma.application.findUnique({
        where: {
            id: user.analising,
            avaliation: null
        }
    })

    if (!bot) {
        interaction.editReply(res.danger("Bot não encontrado ou já foi analisado"))
        await prisma.user.update({
            where: {
                id: interaction.user.id
            },
            data: {
                analising: null
            }
        })
        return
    }

    const [errors] = await prisma.$transaction([
        prisma.annotation.findMany({
            where: {
                applicationId: bot?.id,
                userId: interaction.user.id,
                type
            }
        }),
        prisma.annotation.deleteMany({
            where: {
                applicationId: bot?.id,
                userId: interaction.user.id,
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
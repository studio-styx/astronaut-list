import { prisma } from "#database"
import { res } from "#functions"
import { ChatInputCommandInteraction } from "discord.js"

export default async function removeBotError(interaction: ChatInputCommandInteraction<"cached">, type: "error" | "ortographic") {
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

    const error = interaction.options.getString("erro", true)

    const annotation = await prisma.annotation.findFirst({
        where: {
            applicationId: bot?.id,
            userId: interaction.user.id,
            type,
            text: error
        }
    })

    if (!annotation) {
        interaction.editReply(res.danger("Erro não encontrado"))
        return
    }

    await prisma.annotation.delete({
        where: {
            id: annotation.id
        }
    })

    interaction.editReply(res.success("Erro removido com sucesso"))
}
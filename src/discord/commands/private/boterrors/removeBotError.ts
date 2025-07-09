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

    if (!user?.analisingId) {
        interaction.editReply(res.danger("Você não está analisando nenhum bot"))
        return
    }

    const error = interaction.options.getString("erro", true)

    if (isNaN(Number(error))) {
        interaction.editReply(res.danger("O id da anotação é inválido!"))
        return
    }

    const annotation = await prisma.annotation.findUnique({
        where: {
            id: Number(error),
            type
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
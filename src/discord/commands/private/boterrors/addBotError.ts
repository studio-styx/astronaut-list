import { prisma } from "#database";
import { res } from "#functions";
import { ChatInputCommandInteraction } from "discord.js";

export default async function addBotError(interaction: ChatInputCommandInteraction<"cached">, type: "error" | "ortographic") {
    await interaction.deferReply();
    const user = await prisma.user.findUnique({
        where: {
            id: interaction.user.id
        }
    });

    if (!user?.analisingId) {
        interaction.editReply(res.danger("Você não está analisando nenhum bot"));
        return;
    }

    const analyze = await prisma.analyze.findUnique({
        where: {
            id: user.analisingId
        },
        include: {
            application: true
        }
    });

    if (!analyze) {
        await prisma.user.update({
            where: {
                id: interaction.user.id
            },
            data: {
                analisingId: null
            }
        });
        interaction.editReply(res.danger("Análise não encontrada"));
        return;
    }

    if (!analyze.application) {
        await prisma.user.update({
            where: {
                id: interaction.user.id
            },
            data: {
                analisingId: null
            }
        });
        interaction.editReply(res.danger("Bot não encontrado ou já foi analisado"));
        return;
    }

    const error = interaction.options.getString("erro", true)

    const annotations = await prisma.annotation.create({
        data: {
            analyzeId: analyze.id,
            type,
            text: error
        },
        include: {
            analyze: {
                include: { annotations: true }
            }
        }
    });

    if (type === "error" && annotations.analyze.annotations.length >= 5) {
        interaction.editReply(res.danger(`O bot analisado estourou o limite de erros **(5)**, você deve reprovar-lo e adicionar uma justificativa`));
        return;
    }
    interaction.editReply(res.success("Erro adicionado com sucesso"));
}
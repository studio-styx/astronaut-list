import { prisma } from "#database";
import { res } from "#functions";
import { ChatInputCommandInteraction } from "discord.js";

export default async function addBotError(interaction: ChatInputCommandInteraction<"cached">, type: "error" | "ortographic"){
    await interaction.deferReply();
        const user = await prisma.user.findUnique({
            where: {
                id: interaction.user.id
            }
        });

        if (!user?.analising) {
            interaction.editReply(res.danger("Você não está analisando nenhum bot"));
            return;
        }

        const bot = await prisma.application.findUnique({
            where: {
                id: user.analising,
                avaliation: null
            }
        })

        if (!bot) {
            interaction.editReply(res.danger("Bot não encontrado ou já foi analisado"));
            await prisma.user.update({
                where: {
                    id: interaction.user.id
                },
                data: {
                    analising: null
                }
            });
            return;
        }

        const error = interaction.options.getString("erro", true)

        await prisma.annotation.create({
            data: {
                applicationId: bot.id,
                userId: interaction.user.id,
                type,
                text: error
            }
        });

        const errors = await prisma.annotation.count({
            where: {
                applicationId: bot.id,
                userId: interaction.user.id,
                type
            }
        })

        if (errors >= 5 && type === "error") {
            interaction.editReply(res.danger(`O bot analisado estourou o limite de erros **(5)**, você deve reprovar-lo e adicionar uma justificativa`));
            return;
        }
        interaction.editReply(res.success("Erro adicionado com sucesso"));
}
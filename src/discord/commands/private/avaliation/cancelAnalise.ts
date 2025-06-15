import { prisma } from "#database";
import { res } from "#functions";
import { settings } from "#settings";
import { ChatInputCommandInteraction, userMention } from "discord.js";

export default async function cancelAnalise(interaction: ChatInputCommandInteraction<"cached">) {
    await interaction.deferReply();

    const user = await prisma.user.findUnique({
        where: {
            id: interaction.user.id
        }
    })

    if (!user?.isAvaliator) {
        await interaction.editReply(res.danger("Você não é um avaliador!"));
        return;
    }
    if (!user?.analising) {
        await interaction.editReply(res.danger("Você não está analisando nenhum bot!"));
        return;
    }

    const [bot] = await prisma.$transaction([
        prisma.application.findUnique({
            where: {
                id: user.analising
            }
        }),
        prisma.application.update({
            where: {
                id: user.analising
            },
            data: {
                avaliation: null
            }
        }),
        prisma.user.update({
            where: {
                id: interaction.user.id
            },
            data: {
                analising: null
            }
        }),
        prisma.annotation.updateMany({
            where: {
                userId: user.analising,
                applicationId: user.analising
            },
            data: {
                userId: "0"
            }
        })
    ]);

    const channelId = settings.guild.requests;

    const channel = await interaction.guild.channels.fetch(channelId);

    const botUser = await interaction.client.users.fetch(user.analising);

    if (channel?.isTextBased() && bot) channel.send(res.danger(`${interaction.user} cancelou a analise de <@${user.analising}>`, { thumbnail: botUser?.displayAvatarURL(), content: userMention(bot.userId) }))

    await interaction.editReply(res.danger("Analise cancelada!"));
}
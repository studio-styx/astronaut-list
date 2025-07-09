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
        await interaction.editReply(res.danger("Você não é um analisador!"));
        return;
    }
    if (!user?.analisingId) {
        await interaction.editReply(res.danger("Você não está analisando nenhum bot!"));
        return;
    }

    const [analyse] = await prisma.$transaction([
        prisma.analyze.update({
            where: {
                id: user.analisingId
            },
            data: {
                userId: null
            },
            include: {
                application: true
            }
        }),
        prisma.user.update({
            where: {
                id: interaction.user.id
            },
            data: {
                analisingId: null
            }
        })
    ]);

    const { application: bot } = analyse!;

    if (!bot) {
        await interaction.editReply(res.danger("Bot não encontrado ou já analisado."));
        return;
    }

    const channelId = settings.guild.channels.requests;

    const channel = await interaction.client.channels.fetch(channelId);

    const botUser = await interaction.client.users.fetch(bot.id);

    if (channel?.isTextBased() && bot && 'send' in channel) channel.send(res.danger(`${interaction.user} cancelou a analise de ${userMention(bot.id)}`, { thumbnail: botUser?.displayAvatarURL(), content: userMention(bot.userId) }))

    await interaction.editReply(res.danger("Analise cancelada!"));
}
import { prisma } from "#database";
import { res } from "#functions";
import { settings } from "#settings";
import { ChatInputCommandInteraction, userMention } from "discord.js";

export default async function startAnalise(interaction: ChatInputCommandInteraction<"cached">) {
    await interaction.deferReply();

        const botId = interaction.options.getString("bot", true);

        const [bot, user, alreadyAnalysed] = await prisma.$transaction([
            prisma.application.findUnique({
                where: { id: botId, avaliation: null }
            }),
            prisma.user.findUnique({
                where: { id: interaction.user.id }
            }),
            prisma.user.findFirst({
                where: { analising: botId },
                select: { id: true }
            })
        ]);

        if (!bot) {
            return interaction.editReply(res.danger("Bot não encontrado ou já analisado."));
        }

        if (!user?.isAvaliator) {
            return interaction.editReply(res.danger("Você não tem permissão para analisar bots."));
        }

        if (user.analising) {
            return interaction.editReply(res.danger(`Você já está analisando o bot <@${user.analising}>. Conclua ou cancele essa análise primeiro.`));
        }

        if (alreadyAnalysed) {
            return interaction.editReply(res.danger("Esse bot já está sendo analisado por outra pessoa."));
        }

        const thread = await (interaction.channel?.isTextBased() && 'threads' in interaction.channel
            ? interaction.channel.threads.create({
                name: `Análise do bot: ${bot.name}`,
                autoArchiveDuration: 1440,
                reason: `Análise iniciada por ${interaction.user.tag}`
            })
            : null
        );

        if (!thread) {
            return interaction.editReply(res.danger("Falha ao criar uma thread para a análise."));
        }

        await prisma.$transaction([
            prisma.annotation.updateMany({
                where: {
                    applicationId: botId,
                    userId: "0",
                    type: "error"
                },
                data: {
                    userId: interaction.user.id
                }
            }),
            prisma.user.update({
                where: { id: interaction.user.id },
                data: { analising: botId }
            })
        ]);

        const channelId = settings.guild.requests

        const channel = await interaction.guild.channels.fetch(channelId);

        const botAvatar = interaction.client.users.cache.get(bot.userId)?.avatarURL()

        if (channel?.isTextBased()) channel.send(res.warning(`O analisador <@${interaction.user.id}> começou a analise do bot <@${bot.id}>. do usuário: <@${bot.userId}>`, { thumbnail: botAvatar, content: userMention(bot.userId) }));

        return interaction.editReply(res.success(`Thread de análise criada em: ${thread.toString()}`));
}
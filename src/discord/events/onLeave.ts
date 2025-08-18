import { createEvent } from "#base";
import { prisma } from "#database";
import { res } from "#functions";
import { settings } from "#settings";

createEvent({
    name: "onLeave",
    event: "guildMemberRemove",
    async run(member) {
        const guild = member.guild;
        if (guild.id !== settings.guild.principalId) return;

        const { id } = member;

        const leaveChannel = guild.channels.cache.get(settings.guild.channels.requests);

        if (!leaveChannel || !leaveChannel.isTextBased()) return;

        if (member.user.bot) {
            const [removedBot] = await prisma.$transaction([
                prisma.application.findUnique({
                    where: {
                        id
                    },
                }),
                prisma.application.delete({
                    where: {
                        id
                    },
                }),
            ])

            if (!removedBot) return;

            leaveChannel.send(res.danger(`O bot ${removedBot.name} saiu do server e foi excluido do banco de dados`));
            return;
        }

        const [removedBots] = await prisma.$transaction([
            prisma.application.findMany({
                where: {
                    userId: id,
                },
            }),
            prisma.application.deleteMany({
                where: {
                    userId: id,
                },
            }),
        ])

        if (removedBots.length > 0) {
            await leaveChannel.send(res.danger(`O usuario ${member.user.username} saiu do server e suas aplicações: ${removedBots.map(bot => bot.name).join(", ")} foram excluidas do banco de dados, e kicadas do server`));
        }

        for (const bot of removedBots) {
            const botUser = await guild.members.fetch(bot.userId).catch(() => null);
            try {
                if (botUser) {
                    await botUser.kick("the owner has been left from the server")
                }
            } catch (e: any) {
                console.log("Failed to kick", botUser?.id, "with reason:", e.message, "the bot has been removed from the database");
                await leaveChannel.send(res.danger(`failed to kick <@${bot.userId}> with reason: ${e.message}`))
            }
        }
    },
});
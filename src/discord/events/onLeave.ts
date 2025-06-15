import { createEvent } from "#base";
import { prisma } from "#database";

createEvent({
    name: "onLeave",
    event: "guildMemberRemove",
    async run(member) {
        const guild = member.guild;
        if (guild.id !== "1338980027529957396") return;

        const { id } = member;

        const leaveChannel = guild.channels.cache.get("1339061450206871654");

        if (!leaveChannel || !leaveChannel.isTextBased()) return;

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
            await leaveChannel.send(`<@${id}> left the server. Removed ${removedBots.length} applications: ${removedBots.map(bot => bot.name).join(", ")}`);
        }

        for (const bot of removedBots) {
            const botUser = await guild.members.fetch(bot.userId).catch(() => null);
            try {
                if (botUser) {
                    await botUser.kick("the owner has been left from the server")
                }
            } catch (e: any) {
                console.log("Failed to kick", botUser?.id, "with reason:", e.message, "the bot has been removed from the database");
                await leaveChannel.send(`failed to kick <@${bot.userId}> with reason: ${e.message}`)
            }
        }
    },
});
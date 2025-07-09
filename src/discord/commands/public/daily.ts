import { createCommand } from "#base";
import { prisma } from "#database";
import { res } from "#functions";
import { ApplicationCommandType } from "discord.js";

createCommand({
    name: "daily",
    description: "receber o daily diario",
    type: ApplicationCommandType.ChatInput,
    async run(interaction){
        await interaction.deferReply();

        const now = new Date();

        const cooldown = await prisma.cooldown.findUnique({
            where: {
                userId_name: {
                    userId: interaction.user.id,
                    name: "daily"
                }
            }
        })

        if (cooldown && cooldown.endIn > now) {
            interaction.editReply(res.danger(`Você ainda está em cooldown! volte novamente <t:${Math.floor(Number(cooldown.endIn) / 1000)}:R>`));
            return;
        }

        await prisma.cooldown.upsert({
            where: {
                userId_name: {
                    userId: interaction.user.id,
                    name: "daily"
                }
            },
            update: {
                endIn: new Date(now.getTime() + 1000 * 60 * 60 * 24)
            },
            create: {
                userId: interaction.user.id,
                name: "daily",
                endIn: new Date(now.getTime() + 1000 * 60 * 60 * 24)
            }
        })

        const coins = Math.floor(Math.random() * (500 - 100 + 1)) + 100;

        await prisma.user.upsert({
            where: {
                id: interaction.user.id
            },
            update: {
                coins: { increment: coins }
            },
            create: {
                id: interaction.user.id,
                coins: coins
            }
        })

        interaction.editReply(res.success(`Você recebeu **${coins}** Planetas no daily!`));
    }
});
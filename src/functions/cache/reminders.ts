import { prisma } from '#database';
import { TextChannel } from 'discord.js';

interface Reminder {
    userId: string;
    channelId: string;
    guildId: string;
    endTime: Date;
}

// Cache para armazenar os timeouts ativos
const activeReminders = new Map<string, NodeJS.Timeout>();

// Função para carregar lembretes pendentes ao iniciar o bot
export async function loadPendingReminders(client: any) {
    try {
        // Limpar timeouts antigos (caso o bot tenha reiniciado)
        activeReminders.forEach(timeout => clearTimeout(timeout));
        activeReminders.clear();

        // Buscar todos os lembretes pendentes no banco de dados
        const pendingReminders = await prisma.voteReminder.findMany();

        for (const reminder of pendingReminders) {
            scheduleReminder(client, {
                userId: reminder.userId,
                channelId: reminder.channelId,
                guildId: reminder.guildId,
                endTime: reminder.endTime
            });
        }
    } catch (error) {
        console.error('Erro ao carregar lembretes pendentes:', error);
    }
}

export async function scheduleReminder(client: any, reminder: Reminder) {
    const { userId, channelId, guildId, endTime } = reminder;
    const now = new Date();
    const timeLeft = endTime.getTime() - now.getTime();

    if (timeLeft <= 0) {
        await sendReminder(client, userId, channelId, guildId);
        await prisma.voteReminder.deleteMany({
            where: {
                userId,
                channelId,
                guildId
            }
        });
        activeReminders.delete(`${userId}-${channelId}-${guildId}`);
        return;
    }
    

    // Agendar o lembrete
    const timeout = setTimeout(async () => {
        await sendReminder(client, userId, channelId, guildId);
        await prisma.voteReminder.deleteMany({
            where: {
                userId,
                channelId,
                guildId
            }
        });
        activeReminders.delete(`${userId}-${channelId}-${guildId}`);
    }, timeLeft);

    activeReminders.set(`${userId}-${channelId}-${guildId}`, timeout);

    await prisma.voteReminder.upsert({
        where: {
            userId_channelId_guildId: {
                userId,
                channelId,
                guildId
            }
        },
        create: {
            userId,
            channelId,
            guildId,
            endTime
        },
        update: {
            endTime
        }
    });
}

async function sendReminder(client: any, userId: string, channelId: string, guildId: string) {
    try {
        const guild = await client.guilds.fetch(guildId);
        if (!guild) return;

        const channel = await guild.channels.fetch(channelId);
        if (!channel || !(channel instanceof TextChannel)) return;

        await channel.send(`<@${userId}>, você pode votar novamente!`);
        await prisma.voteReminder.deleteMany({
            where: {
                userId,
                channelId,
                guildId
            }
        })
        activeReminders.delete(`${userId}-${channelId}-${guildId}`);
    } catch (error) {
        console.error('Erro ao enviar lembrete:', error);
    }
}
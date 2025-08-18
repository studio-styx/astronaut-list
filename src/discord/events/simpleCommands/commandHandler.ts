import { createEvent } from "#base";
import { settings } from "#settings";
import { ChannelType, Message } from "discord.js";
import { vote } from "./commands/vote.js";
import { res } from "#functions";
import fs from 'fs'

// Armazenamos as filas por ID de thread
const threadQueues: Record<string, {
    messages: Message[];
    timeout: NodeJS.Timeout | null;
}> = {};

const maxMessages = 5;
const maxWaitTime = 20000;

const sendMessagesViaWebhook = async (message: Message) => {
    const threadId = message.channel.id;
    const queue = threadQueues[threadId];

    if (!queue || queue.messages.length === 0) return;

    const workDir = process.cwd();
    const file = JSON.parse(fs.readFileSync(`${workDir}/threads.json`, 'utf8'));
    const threadJson: { replicated: string } = file[threadId];

    const channelReplicated = message.client.channels.cache.get(threadJson.replicated);

    if (!channelReplicated || !channelReplicated.isThread()) return;

    // Enviamos uma cópia da fila atual e limpamos
    const messagesToSend = [...queue.messages];
    queue.messages = [];
    if (queue.timeout) {
        clearTimeout(queue.timeout);
        queue.timeout = null;
    }

    for (const msg of messagesToSend) {
        try {
            const payload: any = {
                content: `\`msg from: ${msg.author.username}\`\n${msg.content}`,
                username: msg.author.username,
                avatarURL: msg.author.displayAvatarURL(),
                files: [...msg.attachments.values()].map(attachment => attachment.url),
                embeds: msg.embeds,
            };

            if (msg.content.includes('@everyone') || msg.content.includes('@here')) {
                payload.content = msg.content
                    .replace(/@everyone/g, '@\u200beveryone')
                    .replace(/@here/g, '@\u200bhere');

                await channelReplicated.send(payload);
                continue;
            }

            if (!msg.content && !msg.embeds?.length && !msg.attachments.size && msg.components?.length > 0) {
                if ('send' in channelReplicated) {
                    await channelReplicated.send({
                        components: msg.components,
                        flags: ["IsComponentsV2"]
                    });
                }
                continue;
            }

            await channelReplicated.send(payload);
        } catch (error) {
            console.error('Error sending message:', error);
        }
    }
};

const handleSandboxMessage = async (message: Message) => {
    const threadId = message.channel.id;

    // Inicializa a fila se não existir
    if (!threadQueues[threadId]) {
        threadQueues[threadId] = {
            messages: [],
            timeout: null
        };
    }

    const queue = threadQueues[threadId];

    // Se for a primeira mensagem, inicia o timeout
    if (queue.messages.length === 0) {
        queue.timeout = setTimeout(() => sendMessagesViaWebhook(message), maxWaitTime);
    }

    queue.messages.push(message);

    // Se atingir o máximo de mensagens, envia imediatamente
    if (queue.messages.length >= maxMessages) {
        await sendMessagesViaWebhook(message);
    }
};

createEvent({
    name: "prefixCommandHandler",
    event: "messageCreate",
    async run(message) {
        if (message?.guild?.id === settings.guild.sandboxId && message.channel.isThread()) {
            await handleSandboxMessage(message).catch(console.error);
        }

        if (message.author.bot) return;
        if (message.channel.type === ChannelType.DM) return;
        if (!message.content.startsWith(settings.prefix.toLowerCase())) return;

        const args = message.content.slice(settings.prefix.length).trim().split(/ +/g);
        const commandName = args.shift()?.toLowerCase();

        if (!commandName) return;

        try {
            switch (commandName) {
                case "votar":
                case "v":
                case "vote": {
                    await vote(message, args);
                    return;
                }
                default: {
                    message.reply("Comando não encontrado! Use **/help** para ver os comandos disponíveis.");
                    return;
                }
            }
        } catch (error) {
            console.error(error);
            message.reply(res.danger("Ocorreu um erro ao executar o comando!"));
            return;
        }
    },
});
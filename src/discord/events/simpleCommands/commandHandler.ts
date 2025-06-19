import { createEvent } from "#base";
import { settings } from "#settings";
import { ChannelType, Interaction, Message, WebhookClient, MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle, APIEmbed, ComponentType, Client } from "discord.js";
import { vote } from "./commands/vote.js";
import fs from "fs";

interface ThreadsData {
    [key: string]: string;
}

interface CachedMessage {
    id: string;
    type: "message" | "interaction";
    content?: string;
    commandName?: string;
    options?: string;
    userId: string;
    timestamp: number;
}

const webhookUrl = process.env.COPY_MESSAGES_WEBHOOK!;
const webhookClient = new WebhookClient({ url: webhookUrl });

// Cache para armazenar mensagens e interações
const messageCache: CachedMessage[] = [];
const MAX_CACHE_SIZE = 5;
const CACHE_TIMEOUT = 20 * 1000; // 20 segundos

// Mapa para rastrear mensagens já processadas
const processedMessages = new Set<string>();

// Função para processar o cache e enviar mensagens completas
async function processCache(channelId: string, client: Client) {
    if (messageCache.length === 0) return;

    try {
        const thread = await client.channels.fetch(channelId);
        if (!thread || !thread.isThread()) return;

        // Obter as últimas mensagens do canal
        const messages = await thread.messages.fetch({ limit: 50 });
        const data: ThreadsData = JSON.parse(fs.readFileSync(`${process.cwd()}/threads.json`, 'utf-8'));
        const destinationThreadId = data[channelId];
        if (!destinationThreadId) return;

        // Processar mensagens do cache
        const uniqueCache = [...new Map(messageCache.map(item => [item.id, item])).values()]; // Remover duplicatas
        for (const cached of uniqueCache) {
            if (processedMessages.has(cached.id)) continue;

            const message = messages.get(cached.id);
            const baseOptions = {
                allowedMentions: { parse: [] },
                username: client.users.cache.get(cached.userId)?.displayName || await client.users.fetch(cached.userId).then(user => user?.displayName || 'Unknown'),
                avatarURL: (await client.users.fetch(cached.userId)).avatarURL() || undefined,
            };

            if (cached.type === "interaction") {
                // Enviar slash command
                const commandContent = `SLASH: /${cached.commandName}${cached.options ? ` ${cached.options}` : ''}`;
                console.log('Enviando slash command para webhook:', { content: commandContent });

                await webhookClient.send({
                    ...baseOptions,
                    content: commandContent,
                    avatarURL: baseOptions.avatarURL || undefined
                });

                // Enviar resposta do comando, se existir
                if (message && message.author.bot) {
                    const messageContent = message.content?.replace(/@(everyone|here)/g, '@\u200b$1') || '';
                    const components = await createComponents(message);
                    const isComponentsV2 = Boolean(message.flags?.bitfield & MessageFlags.IsComponentsV2);

                    if (isComponentsV2) {
                        // Enviar mensagem de erro ao canal original, apenas uma vez
                        if (!processedMessages.has(cached.id + '-error')) {
                            await thread.send({
                                content: "Não foi possível pegar informações da mensagem",
                                allowedMentions: { parse: [] }
                            });
                            processedMessages.add(cached.id + '-error');
                        }
                    } else if (messageContent || message.embeds.length || message.attachments.size || components?.length) {
                        // Para mensagens sem ComponentsV2
                        const finalContent = messageContent || (components?.length ? `SLASH: /${cached.commandName}` : '');

                        console.log('Enviando resposta de slash command para webhook:', {
                            content: finalContent,
                            embeds: message.embeds,
                            components,
                            files: message.attachments.size
                        });

                        await webhookClient.send({
                            ...baseOptions,
                            content: finalContent,
                            embeds: message.embeds,
                            files: [...message.attachments.values()] as const,
                            components,
                            avatarURL: baseOptions.avatarURL || undefined
                        });
                    }
                }
            } else if (message) {
                // Enviar mensagem normal ou resposta de bot
                const isBot = message.author.bot;
                const messageContent = message.content?.replace(/@(everyone|here)/g, '@\u200b$1') || '';
                const components = await createComponents(message);
                const isComponentsV2 = Boolean(message.flags?.bitfield & MessageFlags.IsComponentsV2);

                if (isComponentsV2) {
                    // Enviar mensagem de erro ao canal original, apenas uma vez
                    if (!processedMessages.has(cached.id + '-error')) {
                        await thread.send({
                            content: "Não foi possível pegar informações da mensagem",
                            allowedMentions: { parse: [] }
                        });

                        await webhookClient.send({
                            ...baseOptions,
                            content: "Não foi possível pegar informações da mensagem",
                            avatarURL: baseOptions.avatarURL || undefined
                        });

                        processedMessages.add(cached.id + '-error');
                    }
                } else if (messageContent || message.embeds.length || message.attachments.size || components?.length) {
                    // Para mensagens sem ComponentsV2
                    const finalContent = isBot && !messageContent && (message.embeds.length || components?.length)
                        ? `SLASH: /<comando desconhecido>`
                        : messageContent;

                    console.log('Enviando mensagem para webhook:', {
                        content: finalContent,
                        embeds: message.embeds,
                        components,
                        files: message.attachments.size
                    });

                    await webhookClient.send({
                        ...baseOptions,
                        content: finalContent,
                        embeds: message.embeds,
                        files: [...message.attachments.values()] as const,
                        components,
                        avatarURL: baseOptions.avatarURL || undefined
                    });
                }
            }

            processedMessages.add(cached.id);
        }

        // Limpar cache
        messageCache.length = 0;

        // Limpar mensagens processadas antigas
        if (processedMessages.size > 1000) {
            processedMessages.clear();
        }
    } catch (error) {
        console.error('Erro ao processar cache:', error);
    }
}

async function handleSandboxMessage(message: Message | Interaction): Promise<void> {
    if (!message.guild || message.guild.id !== settings.guild.sandboxId) return;
    if (!('channel' in message) || !message.channel?.isThread()) return;

    const channelId = message.channel.id;

    try {
        // Adicionar ao cache
        if ('isCommand' in message && message.isCommand()) {
            let commandInfo = message.commandName;
            if ('options' in message) {
                commandInfo += message.options.data.map(opt => ` ${opt.name}:${opt.value}`).join('');
            }

            // Evitar duplicatas no cache
            if (!messageCache.some(c => c.id === message.id)) {
                messageCache.push({
                    id: message.id,
                    type: "interaction",
                    commandName: message.commandName,
                    options: message.options.data.length ? message.options.data.map(opt => `${opt.name}:${opt.value}`).join(' ') : undefined,
                    userId: message.user.id,
                    timestamp: Date.now()
                });
            }
        } else if (message instanceof Message) {
            // Evitar duplicatas no cache
            if (!messageCache.some(c => c.id === message.id)) {
                messageCache.push({
                    id: message.id,
                    type: "message",
                    content: message.content,
                    userId: message.author.id,
                    timestamp: Date.now()
                });
            }
        }

        // Verificar se deve processar o cache
        if (messageCache.length >= MAX_CACHE_SIZE) {
            await processCache(channelId, message.client);
        } else {
            // Agendar processamento após 20 segundos, se não for cancelado
            setTimeout(() => {
                if (messageCache.length > 0) {
                    processCache(channelId, message.client);
                }
            }, CACHE_TIMEOUT);
        }
    } catch (error) {
        console.error('Erro ao lidar com mensagem:', error);
    }
}

async function createComponents(source: Message | Interaction) {
    if (!('components' in source)) return undefined;
    if (!source.components?.length) return undefined;

    const rows: ActionRowBuilder<ButtonBuilder>[] = [];

    for (const row of source.components) {
        const actionRow = new ActionRowBuilder<ButtonBuilder>();
        
        for (const component of ('components' in row ? row.components : [])) {
            if (component.type === ComponentType.Button) {
                actionRow.addComponents(
                    new ButtonBuilder()
                        .setLabel(component.label || 'Ver original')
                        .setStyle(ButtonStyle.Link)
                        .setURL(source instanceof Message ? source.url : 'https://discord.com')
                );
            }
        }

        if (actionRow.components.length) {
            rows.push(actionRow);
        }
    }

    return rows.length ? rows : undefined;
}

createEvent({
    name: "prefixCommandHandler",
    event: "messageCreate",
    async run(message) {
        if (message?.guild?.id === settings.guild.sandboxId) {
            await handleSandboxMessage(message).catch(console.error);
        }

        if (message.author.bot) return;
        if (message.channel.type === ChannelType.DM) return;
        if (!message.content.startsWith(settings.prefix)) return;
        
        const args = message.content.slice(settings.prefix.length).trim().split(/ +/g);
        const commandName = args.shift()?.toLowerCase();

        if (!commandName) return;

        switch(commandName) {
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
    },
});

createEvent({
    name: "slashCommandHandler",
    event: "interactionCreate",
    async run(interaction) {
        if (interaction.isCommand() || interaction.isContextMenuCommand()) {
            await handleSandboxMessage(interaction).catch(console.error);
        }
    }
});
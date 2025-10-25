import { createCommand, Store } from "#base";
import { prisma } from "#database";
import { res, searchBotsWithCache } from "#functions";
import { settings } from "#settings";
import { erisSdk } from "#tools";
import { createEmbed, createRow } from "@magicyan/discord";
import { ApplicationCommandOptionType, ApplicationCommandType, ButtonBuilder, ButtonStyle, TextChannel, time } from "discord.js";

const cooldownStore = new Store<Date>();

createCommand({
    name: "bot",
    description: "bot commands",
    type: ApplicationCommandType.ChatInput,
    options: [
        {
            name: "info",
            description: "ver as informações de um bot",
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: "bot",
                    description: "bot que deseja ver as informações",
                    type: ApplicationCommandOptionType.String,
                    required: true,
                    autocomplete: true
                }
            ]
        },
        {
            name: "editar",
            description: "editar a descrição do seu bot",
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: "bot",
                    description: "bot que deseja editar a descrição",
                    type: ApplicationCommandOptionType.String,
                    required: true,
                    autocomplete: true
                },
                {
                    name: "descricao",
                    description: "nova descrição do bot",
                    type: ApplicationCommandOptionType.String,
                    required: true
                }
            ]
        },
        {
            name: "votar",
            description: "votar em um bot",
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: "bot",
                    description: "bot que deseja votar",
                    type: ApplicationCommandOptionType.String,
                    autocomplete: true
                }
            ]
        },
        {
            name: "ranking",
            description: "ver o ranking dos bots",
            type: ApplicationCommandOptionType.Subcommand,
        }
    ],
    async autocomplete(interaction) {
        switch (interaction.options.getSubcommand()) {
            case "info": {
                const focused = interaction.options.getFocused();
                const bots = await searchBotsWithCache(focused);

                return await interaction.respond(
                    bots.map(bot => ({ name: bot.name, value: bot.id }))
                );
            }

            case "editar": {
                const focused = interaction.options.getFocused();
                const bots = await searchBotsWithCache(focused, {
                    userId: interaction.user.id
                });

                return await interaction.respond(
                    bots.map(bot => ({ name: bot.name, value: bot.id }))
                );
            }

            case "votar": {
                const focused = interaction.options.getFocused();
                const bots = await searchBotsWithCache(focused);

                return await interaction.respond(
                    bots.map(bot => ({ name: bot.name, value: bot.id }))
                );
            }
        }
    },
    async run(interaction) {
        switch (interaction.options.getSubcommand()) {
            case "info": {
                const choice = interaction.options.getString("bot", true);

                await interaction.deferReply();

                const bot = await prisma.application.findUnique({
                    where: { id: choice, analyze: { avaliation: { not: null } } },
                    include: {
                        analyze: true,
                        votes: true
                    }
                });

                if (!bot) {
                    interaction.editReply(res.danger("Esse bot não existe!"));
                    return;
                }

                const fields = [
                    { name: "Dono", value: `<@${bot.userId}>`, inline: true },
                    { name: "Votos", value: `${bot.votes.length}`, inline: true },
                    { name: "Descrição", value: `\`${bot.description || "Não definida"}\`` },
                    { name: "Criado em", value: `<t:${Math.floor(bot.createdAt.getTime() / 1000)}:F>`, inline: true },
                    { name: "Avaliação", value: `\`${bot.analyze?.avaliation}\`` },
                    { name: "Prefixo", value: `\`${bot.prefix}\``, inline: true },
                    { name: "Possui comandos slash?", value: bot.hasSlashCommands ? "Sim" : "Não", inline: true }
                ];

                if (bot.website) fields.push({ name: "Site:", value: bot.website, inline: true });
                if (bot.github) fields.push({ name: "Github:", value: bot.github, inline: true });
                if (bot.supportServerLink) fields.push({ name: "Servidor de suporte:", value: bot.supportServerLink, inline: true });

                const embed = createEmbed({
                    title: `Informações de ${bot.name}`,
                    fields,
                    color: settings.colors.developer,
                    thumbnail: await interaction.client.users.fetch(bot.id).then(user => user.displayAvatarURL()),
                    footer: { text: `Executado por ${interaction.user.displayName}` },
                    timestamp: true
                })

                interaction.editReply({ embeds: [embed] });
                return;
            }
            case "editar": {
                const choice = interaction.options.getString("bot", true);
                const description = interaction.options.getString("descricao", true);

                await interaction.deferReply();

                const bot = await prisma.application.findUnique({
                    where: { id: choice, analyze: { avaliation: { not: null } }, userId: interaction.user.id },
                });

                if (!bot) {
                    interaction.editReply(res.danger("Esse bot não existe!"));
                    return;
                }

                await prisma.application.update({
                    where: { id: choice },
                    data: { description }
                });

                interaction.editReply(res.success("Descrição editada com sucesso!"));
                return;
            }
            case "votar": {
                if (cooldownStore.has(interaction.user.id)) {
                    interaction.reply(res.danger(`Você está sendo muito rápido! volte novamente ${time(cooldownStore.get(interaction.user.id))}`));
                    return;
                }

                await interaction.deferReply();

                cooldownStore.set(interaction.user.id, new Date(Date.now() + 1000 * 60 * 2), {
                    time: 1000 * 60 * 2
                })

                const user = await prisma.user.upsert({
                    where: {
                        id: interaction.user.id
                    },
                    create: {
                        id: interaction.user.id
                    },
                    update: {},
                    include: {
                        cooldowns: true,
                        items: true
                    }
                });

                const now = new Date();
                const cooldown = user.cooldowns.find(cooldown => cooldown.name === "vote");

                if (cooldown && cooldown.endIn > now) {
                    interaction.editReply(res.danger(`Você ainda está em cooldown! volte novamente <t:${Math.floor(Number(cooldown.endIn) / 1000)}:R>`));
                    return;
                }

                const botId = interaction.options.getString("bot") || user.defaultVote;
                if (!botId) {
                    interaction.editReply(res.danger(`Você não especificou nenhuma aplicação e nem tem alguma aplicação padrão, por favor escolha um bot na lista.`));
                    return;
                }

                const bot = await prisma.application.findUnique({
                    where: {
                        id: botId
                    },
                    include: {
                        analyze: true,
                        votes: true
                    }
                });

                if (!bot) {
                    interaction.editReply(res.danger("Aplicação não encontrada"));
                    return;
                }

                if (!bot.analyze || !bot.analyze?.finishedIn) {
                    interaction.editReply(res.danger("O bot mencionado ainda não foi analisado!"));
                    return;
                }

                const hasRole = interaction.member?.roles.cache.has("1348957298835587085") // 1348957298835587085 = id do cargo de booster

                const trySendStx = async (): Promise<{ success: true } | { success: false; message: string }> => {
                    const valueToPay = 20

                    try {
                        const tx = await erisSdk.users.get(interaction.user.id).balance.give({
                            amount: valueToPay,
                            channelId: interaction.channelId,
                            guildId: interaction.guildId,
                            reason: `Votou na aplicação ${bot.name}.`,
                            expiresAt: "1m"
                        });

                        await interaction.editReply(res.warning(`Por favor aceite a transação`));

                        const result = await tx.waitForCompletion();

                        if (result === "REJECTED") return {
                            success: false,
                            message: "Você recusou a transação!"
                        }

                        if (result === "EXPIRED") return {
                            success: false,
                            message: "A transação expirou!"
                        }

                        if (result === "DELETED") return {
                            success: false,
                            message: "Um erro na api resultou na exclusão total dessa transação!"
                        }

                        return {
                            success: true,
                        }
                    } catch (error) {
                        console.error("Erro ao pagar o usuário:", error);
                        if (typeof error === "string" && error.includes("Not enough money")) return {
                            success: false,
                            message: "Eu não tenho stx suficiente para te pagar!"
                        }
                        return {
                            success: false,
                            message: "Um erro misterioso me impediu de pagar o usuário"
                        }
                    }
                }

                // Verifica itens ativos (não expirados)
                const getActiveItem = (id: number) =>
                    user.items.find(item => item.id === id && (!item.expiresAt || item.expiresAt > now));

                const doubleVoteItem = getActiveItem(3);
                const has30off = getActiveItem(1);
                const has50off = getActiveItem(2);

                // Lógica de cooldown
                const baseCooldown = 1000 * 60 * 60 * 3; // 3 horas em ms
                let cooldownDuration = baseCooldown;

                if (has50off) {
                    cooldownDuration *= 0.5; // 50% off
                } else if (has30off) {
                    cooldownDuration *= 0.7; // 30% off
                }

                // Prepara operações da transação
                const operations = [
                    // Sempre cria pelo menos 1 voto
                    prisma.votes.create({
                        data: {
                            applicationId: bot.id,
                            userId: interaction.user.id,
                            origin: "SERVER"
                        }
                    }),

                    // Se tiver doubleVote, cria um segundo voto
                    ...(doubleVoteItem ? [
                        prisma.votes.create({
                            data: {
                                applicationId: bot.id,
                                userId: interaction.user.id,
                                origin: "SERVER"
                            }
                        })
                    ] : []),

                    // Cooldown
                    prisma.cooldown.upsert({
                        where: {
                            userId_name: {
                                userId: interaction.user.id,
                                name: "vote"
                            }
                        },
                        create: {
                            userId: interaction.user.id,
                            name: "vote",
                            endIn: new Date(now.getTime() + cooldownDuration)
                        },
                        update: {
                            endIn: new Date(now.getTime() + cooldownDuration)
                        }
                    }),
                ];

                await prisma.$transaction(operations);

                if (hasRole) await prisma.votes.create({
                    data: {
                        applicationId: bot.id,
                        userId: interaction.user.id,
                        origin: "SERVER"
                    }
                })

                const result = await trySendStx();

                const description = hasRole
                    ? `Você votou na aplicação ${bot.name} de <@${bot.userId}>, como você é booster do server o bot ganhou **2** votos! agora ele possui **${bot.votes.length + 2}** votos. \n\n ${result.success ? "E você recebeu **20** stx por ter votado em uma aplicação como booster!" : `Eu não consegui te pagar os 20 stx pelo motivo: **\`${result.message}\`**`}`
                    : `Você votou na aplicação ${bot.name} de <@${bot.userId}>, que agora possui **${bot.votes.length + 1}** votos. \n\n ${result.success ? `E você recebeu **10** stx por ter votado em uma aplicação!` : `Eu não consegui te pagar os 10 stx pelo motivo: **\`${result.message}\`**`}`;


                const embed = createEmbed({
                    title: "Aplicação votada",
                    description,
                    color: settings.colors.success,
                    timestamp: now.toISOString()
                });

                const components = createRow(
                    new ButtonBuilder({
                        customId: `vote/setDefaultVote/${bot.id}/${interaction.user.id}`,
                        label: "Definir como voto padrão",
                        style: ButtonStyle.Success,
                        disabled: user.defaultVote === bot.id
                    }),
                    new ButtonBuilder({
                        customId: `vote/removeDefaultVote/null/${interaction.user.id}`,
                        label: "Remover voto padrão",
                        style: ButtonStyle.Danger,
                        disabled: !user.defaultVote
                    }),
                    new ButtonBuilder({
                        customId: `vote/remind/null/${interaction.user.id}`,
                        label: "Lembrar-me de votar novamente",
                        style: ButtonStyle.Secondary
                    })
                )

                const channel = await interaction.client.channels.fetch(settings.guild.channels.vote)

                if (!channel || !channel.isTextBased()) {
                    interaction.editReply(res.danger("Não foi possível enviar a notificação nos correios, "));
                    return;
                }

                const botUser = await interaction.client.users.fetch(bot.id);
                (channel as TextChannel).send(res.success(`<@${interaction.user.id}> votou na aplicação ${bot.name} de <@${bot.userId}> ${hasRole ? "como o usuário é booster seu voto valeu 2!" : ""}, agora a aplicação tem: **${bot.votes.length + (hasRole ? 2 : 1)}** votos! \n\n ( \`Agora ele espera 3 horas pra poder votar novamente\` )`, { thumbnail: botUser.displayAvatarURL() }));

                interaction.editReply({
                    embeds: [embed],
                    components: [components]
                })
                return;
            }
            case "ranking": {
                await interaction.deferReply();

                const bots = await prisma.application.findMany({
                    where: {
                        analyze: {
                            avaliation: { not: null }
                        }
                    },
                    orderBy: {
                        votes: {
                            _count: "desc"
                        }
                    },
                    include: {
                        votes: true
                    }
                });

                const getUserInfo = async (id: string) => await interaction.client.users.fetch(id)

                const messages = await Promise.all(
                    bots.slice(0, 25).map(async (bot, index) => {
                        const user = await getUserInfo(bot.userId);
                        return `${index + 1} - ( **${bot.name}** de: ${user.username} ) votos: **${bot.votes.length}**`;
                    })
                );

                const message = messages.join("\n");
                interaction.editReply(res.success(message, { title: "Ranking de votos" }));
                return;
            }
        }
    }
});
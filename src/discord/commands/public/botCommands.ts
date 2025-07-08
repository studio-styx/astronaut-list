import { createCommand } from "#base";
import { prisma } from "#database";
import { res, searchBotsWithCache } from "#functions";
import { settings } from "#settings";
import { createEmbed, createRow } from "@magicyan/discord";
import { ApplicationCommandOptionType, ApplicationCommandType, ButtonBuilder, ButtonStyle, TextChannel } from "discord.js";

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
                    name: "descrição",
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
    async run(interaction){
        switch (interaction.options.getSubcommand()) {
            case "info": {
                const choice = interaction.options.getString("bot", true);

                await interaction.deferReply();

                const bot = await prisma.application.findUnique({
                    where: { id: choice, avaliation: { not: null } },
                });

                if (!bot) {
                    interaction.editReply(res.danger("Esse bot não existe!"));
                    return;
                }

                const fields = [
                    { name: "Dono", value: `<@${bot.userId}>`, inline: true },
                    { name: "Votos", value: `${bot.votes}`, inline: true },
                    { name: "Descrição", value: `\`${bot.description || "Não definida"}\`` },
                    { name: "Criado em", value: `<t:${Math.floor(bot.createdAt.getTime() / 1000)}:F>`, inline: true },
                    { name: "Avaliação", value: `\`${bot.avaliation}\`` },
                    { name: "Prefixo", value: `\`${bot.prefix}\``, inline: true },
                ];

                if (bot.prefix2) fields.push({ name: "Prefixo 2", value: `${bot.prefix2}`, inline: true });

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
                const description = interaction.options.getString("descrição", true);

                await interaction.deferReply();

                const bot = await prisma.application.findUnique({
                    where: { id: choice, avaliation: { not: null }, userId: interaction.user.id  },
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
                await interaction.deferReply();

                const user = await prisma.user.upsert({
                    where: {
                        id: interaction.user.id
                    },
                    create: {
                        id: interaction.user.id
                    },
                    update: {},
                    include: {
                        cooldowns: true
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
                    }
                });

                if(!bot){
                    interaction.editReply(res.danger("Aplicação não encontrada"));
                    return;
                }

                const hasRole = interaction.member?.roles.cache.has("1348957298835587085") // 1348957298835587085 = id do cargo de booster

                const [newBot] = await prisma.$transaction([
                    prisma.application.update({
                        where: {
                            id: bot.id
                        },
                        data: {
                            votes: { increment: hasRole ? 2 : 1 },
                        }
                    }),
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
                            endIn: new Date(now.getTime() + 1000 * 60 * 60 * 3) // 1000 * 60 * 60 * 3
                        },
                        update: {
                            endIn: new Date(now.getTime() + 1000 * 60 * 60 * 3)
                        }
                    }),
                    prisma.user.update({
                        where: { id: interaction.user.id },
                        data: {
                            coins: { increment: hasRole ? 700 : 500 }
                        }
                    })
                ])

                const description = hasRole
                    ? `Você votou na aplicação ${bot.name} de <@${bot.userId}>, como você é booster do server o bot ganhou **2** votos! agora ele possui **${newBot.votes}** votos. \n\n Você ganhou **700** planetas`
                    : `Você votou na aplicação ${bot.name} de <@${bot.userId}>, que agora possui **${newBot.votes}** votos. \n\n Você ganhou **500** planetas`;


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
                (channel as TextChannel).send(res.success(`<@${interaction.user.id}> votou na aplicação ${bot.name} de <@${bot.userId}> ${hasRole ? "como o usuário é booster seu voto valeu 2!" : ""}, agora a aplicação tem: **${newBot.votes}** votos! \n\n ( \`Agora ele espera 3 horas pra poder votar novamente\` )`, { thumbnail: botUser.displayAvatarURL() }));

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
                        avaliation: { not: null }
                    },
                    orderBy: {
                        votes: "desc"
                    }
                });

                const getUserInfo = async (id: string) => await interaction.client.users.fetch(id)

                const messages = await Promise.all(
                    bots.slice(0, 25).map(async (bot, index) => {
                        const user = await getUserInfo(bot.userId);
                        return `${index + 1} - ( **${bot.name}** de: ${user.username} ) votos: **${bot.votes}**`;
                    })
                );
                
                const message = messages.join("\n");
                interaction.editReply(res.success(message));
                return;
            }
        }
    }
});
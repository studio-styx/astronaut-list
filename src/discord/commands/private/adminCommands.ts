import { createCommand } from "#base";
import { prisma } from "#database";
import { res } from "#functions";
import { settings } from "#settings";
import { brBuilder, createEmbed } from "@magicyan/discord";
import { ApplicationCommandOptionType, ApplicationCommandType, GuildMember, userMention } from "discord.js";
import fs from "fs";

createCommand({
    name: "admin",
    description: "comandos de admin",
    type: ApplicationCommandType.ChatInput,
    options: [
        {
            name: "blacklist",
            description: "comandos de blacklist",
            type: ApplicationCommandOptionType.SubcommandGroup,
            options: [
                {
                    name: "add",
                    description: "adiciona um usuário a blacklist",
                    type: ApplicationCommandOptionType.Subcommand,
                    options: [
                        {
                            name: "user",
                            description: "usuário a ser adicionado",
                            type: ApplicationCommandOptionType.User,
                            required: true
                        }
                    ]
                },
                {
                    name: "remove",
                    description: "remove um usuário da blacklist",
                    type: ApplicationCommandOptionType.Subcommand,
                    options: [
                        {
                            name: "user",
                            description: "usuário a ser removido",
                            type: ApplicationCommandOptionType.String,
                            required: true,
                            autocomplete: true
                        }
                    ]
                },
                {
                    name: "list",
                    description: "lista todos os usuários da blacklist",
                    type: ApplicationCommandOptionType.Subcommand
                }
            ]
        },
        {
            name: "forçar",
            description: "forçar algo",
            type: ApplicationCommandOptionType.SubcommandGroup,
            options: [
                {
                    name: "cancelar-analise",
                    description: "força o cancelamento de uma análise",
                    type: ApplicationCommandOptionType.Subcommand,
                    options: [
                        {
                            name: "analise",
                            description: "Analise a ser forçada",
                            type: ApplicationCommandOptionType.String,
                            required: true,
                            autocomplete: true
                        },
                        {
                            name: "motivo",
                            description: "motivo do cancelamento",
                            type: ApplicationCommandOptionType.String,
                            required: false,
                        }
                    ]
                }
            ]
        },
        {
            name: "limpeza",
            description: "comandos de limpeza",
            type: ApplicationCommandOptionType.SubcommandGroup,
            options: [
                {
                    name: "bots-off-pegar",
                    description: "Obter todos os bots off sem kickar eles",
                    type: ApplicationCommandOptionType.Subcommand
                },
                {
                    name: "bots-off-kickar",
                    description: "Obter todos os bots off e kickar eles",
                    type: ApplicationCommandOptionType.Subcommand,
                    options: [
                        {
                            name: "possibleOffline",
                            description: "Se você quer kickar bots possivelmente offline, marque como true",
                            type: ApplicationCommandOptionType.Boolean,
                            required: false
                        }
                    ]
                }
            ]
        }
    ],
    async autocomplete(interaction) {
        const focusedValue = interaction.options.getFocused().toLowerCase();

        const getUserName = async (id: string) => {
            const cachedUser = interaction.client.users.cache.get(id);
            if (cachedUser) {
                return cachedUser.displayName ?? cachedUser.username ?? "Não encontrado";
            }

            try {
                const fetchedUser = await interaction.client.users.fetch(id);
                return fetchedUser.displayName ?? fetchedUser.username ?? "Não encontrado";
            } catch (error) {
                return "Não encontrado";
            }
        };

        if (interaction.options.getSubcommandGroup() === "blacklist") {
            const rootPath = process.cwd();
            const blackListedusers: string[] = JSON.parse(
                fs.readFileSync(`${rootPath}/blacklist.json`, "utf-8")
            );

            const users = await Promise.all(
                blackListedusers.map(async (id) => {
                    const name = await getUserName(id);
                    return { name, value: id };
                })
            );

            const filteredUsers = users.filter(user =>
                user.name.toLowerCase().includes(focusedValue)
            );

            await interaction.respond(
                filteredUsers.slice(0, 25)
            );
        } else {
            const avaliations = await prisma.user.findMany({
                where: {
                    analising: { not: null }
                }
            });

            if (avaliations.length === 0) {
                await interaction.respond([{ name: "Nenhuma análise encontrada", value: "Nenhuma análise encontrada" }]);
                return;
            }

            const options = avaliations.map(async avaliation => {
                if (!avaliation?.analising) return { name: `${await getUserName(avaliation.id)} analisando: desconhecido` };
                return {
                    name: `${await getUserName(avaliation.id)} analisando: ${await getUserName(avaliation?.analising)}`,
                    value: avaliation.id
                };
            });

            const filteredOptions = (await Promise.all(options)).filter(option =>
                option.name.toLowerCase().includes(focusedValue)
            );

            await interaction.respond(
                filteredOptions
                    .filter(option => option.value !== undefined)
                    .map(option => ({
                        name: option.name,
                        value: option.value || option.name
                    }))
                    .slice(0, 25)
            );
        }
    },
    async run(interaction) {
        const { options, user } = interaction;

        if (!settings.admins.includes(user.id)) {
            interaction.reply(res.danger("Você não tem permissão para usar este comando!"));
            return;
        }

        const subcommand = options.getSubcommand(true);
        const subcommandGroup = options.getSubcommandGroup(true);

        switch (subcommandGroup) {
            case "blacklist":
                switch (subcommand) {
                    case "add": {
                        const user = options.getUser("user", true);
                        const rootPath = process.cwd();
                        const blackListedUsers: string[] = JSON.parse(fs.readFileSync(`${rootPath}/blacklist.json`, "utf-8"));
                        if (blackListedUsers.includes(user.id)) {
                            interaction.reply(res.danger("Usuário já está na blacklist!"));
                            return;
                        }
                        blackListedUsers.push(user.id);
                        fs.writeFileSync(`${rootPath}/blacklist.json`, JSON.stringify(blackListedUsers));
                        interaction.reply(res.warning("Usuário adicionado na blacklist!"));
                        return;
                    }
                    case "remove": {
                        const userId = options.getString("user", true);
                        const rootPath = process.cwd();
                        const blackListedUsers: string[] = JSON.parse(fs.readFileSync(`${rootPath}/blacklist.json`, "utf-8"));
                        if (!blackListedUsers.includes(userId)) {
                            interaction.reply(res.danger("O Usuário não está na blacklist!"));
                            return;
                        }
                        blackListedUsers.splice(blackListedUsers.indexOf(userId), 1);
                        fs.writeFileSync(`${rootPath}/blacklist.json`, JSON.stringify(blackListedUsers));
                        interaction.reply(res.success("Usuário removido da blacklist!"));
                        return;
                    }
                }
            case "forçar":
                switch (subcommand) {
                    case "cancelar-analise": {
                        const botId = options.getString("analise", true);

                        await interaction.deferReply();

                        const avaliator = await prisma.user.findFirst({
                            where: {
                                analising: botId
                            }
                        })

                        if (!avaliator) {
                            interaction.reply(res.danger(`Analise não encontrada para: ${userMention(botId)}`));
                            return;
                        }

                        const [__, bot] = await prisma.$transaction([
                            prisma.user.update({
                                where: {
                                    id: botId
                                },
                                data: {
                                    analising: null
                                }
                            }),
                            prisma.application.findUnique({
                                where: {
                                    id: botId
                                }
                            })
                        ])

                        if (!bot) {
                            interaction.reply(res.danger(`Bot não encontrado para: ${userMention(botId)}`));
                            return;
                        }

                        try {
                            const channel = await interaction.client.channels.fetch(settings.guild.channels.requests);

                            const embed = createEmbed({
                                title: "Analise cancelada",
                                description: `O administrador ${userMention(interaction.user.id)} forçou o cancelamento da analise de ${userMention(avaliator.id)} que estava analisando o bot: ${userMention(botId)} com o motivo: \`${options.getString("motivo") || "Não especificado"}\``,
                                color: "Red",
                                thumbnail: interaction.client.users.cache.get(bot.userId || avaliator.id)?.displayAvatarURL()
                            });

                            if (!channel || !channel?.isTextBased()) {
                                interaction.reply(res.danger(`Canal de solicitações não encontrado!`));
                                return;
                            };

                            if ("send" in channel) {
                                await channel.send({ embeds: [embed], content: userMention(bot.userId) });
                                interaction.editReply(res.success(`Analise cancelada com sucesso!`));
                                return;
                            } else {
                                interaction.reply(res.danger(`Canal de solicitações não encontrado!`));
                                return;
                            }
                        } catch (error: any) {
                            console.error(error);
                            interaction.editReply(res.danger(`Erro ao enviar mensagem para o canal de solicitações: ${error.message}`));
                            return;
                        }
                    }
                }
            case "limpeza":
                switch (subcommand) {
                    case "bots-off-pegar": {
                        await interaction.deferReply();

                        const guild = interaction.client.guilds.cache.get(settings.guild.principalId);
                        if (!guild) {
                            await interaction.editReply(res.danger("Servidor não encontrado!"));
                            return;
                        }

                        const members = await guild.members.fetch({ withPresences: true }).catch((err) => {
                            console.error("Erro ao buscar membros:", err);
                            return null;
                        });
                        if (!members) {
                            await interaction.editReply(res.danger("Erro ao buscar membros do servidor!"));
                            return;
                        }

                        const botsOff: { id: string; name: string; owner: string, presence: string | undefined }[] = [];

                        for (const [id, member] of members) {
                            const memberPresence = member.presence?.status
                            if (member.user.bot && (memberPresence === "offline" || memberPresence === undefined)) {
                                try {
                                    const prismaBot = await prisma.application.findUnique({
                                        where: { id },
                                    });
                                    if (prismaBot) {
                                        botsOff.push({
                                            id,
                                            name: member.user.username,
                                            owner: prismaBot.userId,
                                            presence: memberPresence
                                        });
                                    }
                                } catch (err) {
                                    console.error(`Erro ao buscar bot ${id} no banco de dados:`, err);
                                }
                            }
                        }

                        if (botsOff.length === 0) {
                            await interaction.editReply(res.danger("Nenhum bot offline encontrado!"));
                            return;
                        }

                        const embed = createEmbed({
                            title: "Bots Off",
                            description: brBuilder(
                                "Bots offline encontrados: " + botsOff.length + "\n\n",
                                "Bots offline:",
                                botsOff.filter(bot => bot.presence === "offline").map((bot) => `> ${userMention(bot.id)} - ${bot.name || "Não encontrado"} bot de: ${userMention(bot.owner)}`).join("\n"),
                                "Bots provavelmente offline:",
                                botsOff.filter(bot => bot.presence === undefined).map((bot) => `> ${userMention(bot.id)} - ${bot.name || "Não encontrado"} bot de: ${userMention(bot.owner)}`).join("\n"),
                            ),
                            color: "Red",
                        });

                        await interaction.editReply({ embeds: [embed] });
                        return;
                    }
                    case "bots-off-kickar": {
                        await interaction.deferReply();
                        const possibleOffline = options.getBoolean("possibleOffline", false) ?? false;

                        const guild = interaction.client.guilds.cache.get(settings.guild.principalId);
                        if (!guild) {
                            await interaction.editReply(res.danger("Servidor não encontrado!"));
                            return;
                        }

                        const members = await guild.members.fetch({ withPresences: true }).catch((err) => {
                            console.error("Erro ao buscar membros:", err);
                            return null;
                        });
                        if (!members) {
                            await interaction.editReply(res.danger("Erro ao buscar membros do servidor!"));
                            return;
                        }

                        const botsOff: { id: string; name: string; owner: string; member: GuildMember }[] = [];

                        for (const [id, member] of members) {
                            if (member.user.bot && (member.presence?.status === "offline" || (possibleOffline && member.presence?.status === undefined))) {
                                try {
                                    const prismaBot = await prisma.application.findUnique({
                                        where: { id },
                                    });
                                    if (prismaBot) {
                                        botsOff.push({
                                            id,
                                            name: member.user.username,
                                            member,
                                            owner: prismaBot.userId
                                        });
                                    }
                                } catch (err) {
                                    console.error(`Erro ao buscar bot ${id} no banco de dados:`, err);
                                }
                            }
                        }

                        if (botsOff.length === 0) {
                            await interaction.editReply(res.danger("Nenhum bot offline encontrado!"));
                            return;
                        }

                        for (const bot of botsOff) {
                            try {
                                await bot.member.kick("Bot offline");
                                await prisma.application.delete({
                                    where: { id: bot.id },
                                });
                            } catch (err) {
                                console.error(`Erro ao expulsar ou remover bot ${bot.id}:`, err);
                            }
                        }

                        const embed = createEmbed({
                            title: "Bots Off",
                            description: `Total de bots off expulsos: ${botsOff.length}\n\n${botsOff
                                .map((bot) => `> ${userMention(bot.id)} - ${bot.name || "Não encontrado"} bot de: ${userMention(bot.owner)}`)
                                .join("\n")}`,
                            color: "Red",
                        });

                        await interaction.editReply({ embeds: [embed] });
                        return;
                    }
                }
        }
    }
});
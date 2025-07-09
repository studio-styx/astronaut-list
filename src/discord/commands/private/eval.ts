import { createCommand } from "#base";
import { res } from "#functions";
import { settings } from "#settings";
import { ApplicationCommandOptionType, ApplicationCommandType, GuildChannelCreateOptions } from "discord.js";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

createCommand({
    name: "eval",
    description: "Executa código JavaScript e prisma",
    type: ApplicationCommandType.ChatInput,
    options: [
        {
            name: "code",
            description: "Código para executar",
            type: ApplicationCommandOptionType.String,
            required: true
        }
    ],
    async run(interaction) {
        if (!settings.admins.includes(interaction.user.id)) {
            await interaction.reply(res.danger("Você não tem permissão para usar este comando!"));
            return;
        }

        const code = interaction.options.getString("code", true);

        // Contexto no estilo aoi.js
        const ctx = {
            client: interaction.client,
            guild: interaction.guild,
            channel: interaction.channel,
            user: interaction.user,
            users: {
                async ban(userId: string, reason: string = "Nenhum motivo fornecido") {
                    const member = await interaction.guild.members.fetch(userId).catch(() => null);
                    if (!member) throw new Error("Usuário não encontrado ou não é um membro do servidor.");
                    await member.ban({ reason });
                    return { success: true, userId, reason };
                },
                async kick(userId: string, reason: string = "Nenhum motivo fornecido") {
                    const member = await interaction.guild.members.fetch(userId).catch(() => null);
                    if (!member) throw new Error("Usuário não encontrado ou não é um membro do servidor.");
                    await member.kick(reason);
                    return { success: true, userId, reason };
                },
                async unban(userId: string, reason: string = "Nenhum motivo fornecido") {
                    const bannedUsers = await interaction.guild.bans.fetch();
                    const bannedUser = bannedUsers.find(user => user.user.id === userId);
                    if (!bannedUser) throw new Error("Usuário não banido.");
                    await interaction.guild.bans.remove(userId, reason);
                    return { success: true, userId, reason };
                },
                async mute(userId: string, time: number = 10, reason: string = "Nenhum motivo fornecido", ) {
                    const member = await interaction.guild.members.fetch(userId).catch(() => null);
                    if (!member) throw new Error("Usuário não encontrado ou não é um membro do servidor.");
                    await member.timeout(time * 1000, reason);
                    return { success: true, userId, reason, time };
                },
                async unmute(userId: string, reason: string = "Nenhum motivo fornecido") {
                    const member = await interaction.guild.members.fetch(userId).catch(() => null);
                    if (!member) throw new Error("Usuário não encontrado ou não é um membro do servidor.");
                    await member.timeout(null, reason);
                    return { success: true, userId, reason };
                },
                async fetch(userId: string) {
                    return await interaction.client.users.fetch(userId);
                }
            },
            guilds: {
                channels: {
                    async create(options: GuildChannelCreateOptions) {
                        return await interaction.guild.channels.create(options);
                    },
                    async fetch(channelId: string) {
                        return await interaction.guild.channels.fetch(channelId);
                    }
                },
                members: {
                    async fetch(userId: string) {
                        return await interaction.guild.members.fetch(userId);
                    }
                }
            }
        };

        await interaction.deferReply();

        try {
            let result;
            let isPrisma = code.includes("prisma.");
            let isCtx = code.includes("ctx.");

            if (isPrisma && !code.includes("await")) {
                await interaction.editReply(res.danger("Operações Prisma devem usar 'await'. Exemplo: \`'await prisma.user.findUnique(...)'\`"));
                return;
            }

            if (isPrisma) {
                // Validação para operações Prisma
                const prismaOperations = [
                    "findUnique", "findMany", "create", "update",
                    "delete", "upsert", "findFirst", "count"
                ];
                const hasValidOperation = prismaOperations.some(op => code.includes(`.${op}(`));
                if (!hasValidOperation) {
                    await interaction.editReply(res.danger("Operação Prisma inválida ou não suportada detectada."));
                    return;
                }

                // Executa código Prisma
                result = await eval(`(async () => { return ${code} })()`);
            } else if (isCtx) {
                // Executa código com ctx no estilo aoi.js
                result = await eval(`(async () => { return ${code} })()`);
            } else {
                // Executa JavaScript puro
                result = eval(code);
            }

            // Formata e envia o resultado
            const formattedResult = JSON.stringify(result, null, 2);
            await interaction.editReply(res.success(`Resultado: \`\`\`json\n${formattedResult.slice(0, 3000)}\`\`\``, { flags: [] }));

            // Envia o restante do resultado, se necessário
            if (formattedResult.length > 3000) {
                let remaining = formattedResult.slice(3000);
                while (remaining.length > 0) {
                    const chunk = remaining.slice(0, 3900);
                    await interaction.followUp(res.success(`\`\`\`json\n${chunk}\`\`\``, { flags: [] }));
                    remaining = remaining.slice(3900);
                }
            }
        } catch (error: any) {
            await interaction.editReply(res.danger(`Ocorreu um erro: ${error.message}`));
        } finally {
            if (code.includes("prisma.")) {
                await prisma.$disconnect();
            }
        }
    }
});
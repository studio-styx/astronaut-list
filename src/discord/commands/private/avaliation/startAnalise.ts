import { prisma } from "#database";
import { res } from "#functions";
import { settings } from "#settings";
import { ChatInputCommandInteraction, userMention } from "discord.js";
import fs from "fs/promises";
import { existsSync } from "fs";

export default async function startAnalise(interaction: ChatInputCommandInteraction<"cached">) {
    await interaction.deferReply();

    const botId = interaction.options.getString("bot", true);
    const rootPath = `${process.cwd()}/threads.json`;
    const backupPath = `${process.cwd()}/threads_backup.json`;

    async function tryUnlinkWithRetry(path: string, retries = 5, delay = 200): Promise<void> {
        for (let i = 0; i < retries; i++) {
            try {
                if (existsSync(path)) {
                    await fs.unlink(path);
                    console.log(`Backup ${path} removido com sucesso`);
                }
                return;
            } catch (err: any) {
                if (err.code === "EBUSY" && i < retries - 1) {
                    console.warn(`Tentativa ${i + 1} falhou ao excluir ${path}. Tentando novamente após ${delay}ms...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    continue;
                }
                console.error(`Erro ao excluir ${path}:`, err.message);
                return; // Não lança erro, apenas loga
            }
        }
    }

    try {
        // Verificar se threads.json existe; se não, criar com objeto vazio
        if (!existsSync(rootPath)) {
            await fs.writeFile(rootPath, JSON.stringify({}, null, 4));
            console.log(`Arquivo ${rootPath} criado`);
        }

        // Fazer backup do threads.json
        console.log(`Criando backup em ${backupPath}`);
        await fs.copyFile(rootPath, backupPath);
        console.log(`Backup criado com sucesso`);

        // Verificações iniciais
        const [bot, user, alreadyAnalysed] = await prisma.$transaction([
            prisma.application.findUnique({
                where: { id: botId },
                include: { analyze: true }
            }),
            prisma.user.findUnique({
                where: { id: interaction.user.id }
            }),
            prisma.analyze.findFirst({
                where: {
                    applicationId: botId,
                    finishedIn: null,
                    userId: { not: null }
                }
            })
        ]);

        // Verifica se o bot existe e não foi analisado
        if (!bot || (bot.analyze && bot.analyze.finishedIn !== null)) {
            return await interaction.editReply(res.danger("Bot não encontrado ou já analisado."));
        }

        if (!user?.isAvaliator) {
            return await interaction.editReply(res.danger("Você não tem permissão para analisar bots."));
        }

        if (user?.analisingId) {
            const botAnalising = await prisma.analyze.findUnique({
                where: { id: user.analisingId }
            });
            return await interaction.editReply(res.danger(`Você já está analisando o bot <@${botAnalising?.applicationId}>. Conclua ou cancele essa análise primeiro.`));
        }

        if (alreadyAnalysed) {
            return await interaction.editReply(res.danger("Esse bot já está sendo analisado por outra pessoa."));
        }

        // Transação principal
        const result = await prisma.$transaction(async (tx) => {
            try {
                const analyse = await tx.analyze.upsert({
                    where: { id: (await tx.analyze.findFirst({ where: { applicationId: botId } }))?.id ?? -1 },
                    update: { userId: interaction.user.id },
                    create: { applicationId: botId, userId: interaction.user.id },
                });

                await Promise.all([
                    tx.user.update({
                        where: { id: interaction.user.id },
                        data: { analisingId: analyse.id }
                    }),
                    tx.application.update({
                        where: { id: botId },
                        data: { analyzeId: analyse.id }
                    })
                ])

                const thread = await (interaction.channel?.isTextBased() && 'threads' in interaction.channel
                    ? interaction.channel.threads.create({
                        name: `Análise do bot: ${bot.name}`,
                        autoArchiveDuration: 1440,
                        reason: `Análise iniciada por ${interaction.user.tag}`
                    })
                    : null
                );

                if (!thread) {
                    throw new Error("Falha ao criar a thread de análise.");
                }

                const replicatedChannel = await interaction.client.channels.fetch(settings.guild.channels.analisando);

                const replicatedThread = await (replicatedChannel?.isTextBased() && 'threads' in replicatedChannel
                    ? replicatedChannel.threads.create({
                        name: `Análise do bot: ${bot.name}`,
                        autoArchiveDuration: 1440,
                        reason: `Análise iniciada por ${interaction.user.tag}`
                    })
                    : null
                );

                if (!replicatedThread) {
                    throw new Error("Falha ao criar a thread rastreada para a análise.");
                }

                const channelId = settings.guild.channels.requests;
                const channel = await interaction.client.channels.fetch(channelId);
                const botAvatar = interaction.client.users.cache.get(bot.userId)?.avatarURL();

                if (channel?.isTextBased() && 'send' in channel) {
                    await channel.send(res.warning(
                        `O analisador <@${interaction.user.id}> começou a análise do bot <@${bot.id}>. do usuário: <@${bot.userId}>`,
                        { thumbnail: botAvatar, content: userMention(bot.userId) }
                    ));
                } else {
                    throw new Error("Falha ao enviar a mensagem no canal de requests.");
                }

                return { thread, replicatedThread };
            } catch (error: any) {
                throw new Error(`Erro no banco de dados ou na criação de threads: ${error.message}`);
            }
        });

        // Atualizar threads.json após transação bem-sucedida
        try {
            console.log(`Lendo ${rootPath} para atualização`);
            const preview: { [key: string]: { replicated: string } } = JSON.parse(await fs.readFile(rootPath, "utf-8"));
            preview[result.thread.id] = { replicated: result.replicatedThread.id };
            console.log(`Escrevendo atualização em ${rootPath}`);
            await fs.writeFile(rootPath, JSON.stringify(preview, null, 4));
            console.log(`Arquivo ${rootPath} atualizado com sucesso`);
        } catch (error: any) {
            console.error(`Erro ao atualizar ${rootPath}:`, error.message);
            await fs.copyFile(backupPath, rootPath);
            console.log(`Backup restaurado em ${rootPath}`);
            throw new Error(`Erro ao atualizar o arquivo threads.json: ${error.message}`);
        }

        // Resposta final
        await interaction.editReply(res.success(`Thread de análise criada em: ${result.thread.toString()}`));
    } catch (error: any) {
        console.error("Erro na análise:", error);
        // Restaurar backup do threads.json em caso de erro
        if (existsSync(backupPath)) {
            try {
                await fs.copyFile(backupPath, rootPath);
                console.log(`Backup restaurado em ${rootPath}`);
            } catch (restoreError: any) {
                console.error("Erro ao restaurar backup:", restoreError.message);
            }
        }
        await interaction.editReply(res.danger(`Ocorreu um erro: ${error.message}`));
    } finally {
        // Remover backup após conclusão (sucesso ou falha)
        await tryUnlinkWithRetry(backupPath);
    }
    return;
}
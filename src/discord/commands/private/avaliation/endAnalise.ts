import { prisma } from "#database";
import { icon, res } from "#functions";
import { settings } from "#settings";
import { brBuilder, createContainer, createSection, createSeparator } from "@magicyan/discord";
import { ChatInputCommandInteraction, time, userMention } from "discord.js";
import fs from "fs/promises"; // Usar fs.promises para operações assíncronas
import { existsSync } from "fs";

// Função auxiliar para tentar excluir arquivo com retries
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
            return;
        }
    }
}

// Função auxiliar para formatar componentes da mensagem
function buildAnalysisComponents(
    ownerId: string,
    botId: string,
    analyserId: string,
    analyseId: string,
    justification: string,
    annotations: { type: string; text: string }[],
    approved: boolean,
    createdAt: Date,
    client: ChatInputCommandInteraction<"cached">["client"]
): any[] {
    const ownerUser = client.users.cache.get(ownerId) || null;
    const userBot = client.users.cache.get(botId) || null;

    return [
        `${!ownerUser ? "Não encontrado" : userMention(ownerUser.id)} - **${approved ? icon.approved : icon.block} | Seu bot foi ${approved ? "aprovado" : "reprovado"}!**`,
        createSeparator(),
        createSection({
            content: brBuilder(
                `## ( ${icon.bug} ╺╸ Erros encontrados durante a análise:`,
                annotations.filter(e => e.type === "error").map((annotation, index) => {
                    return `> ${index + 1}. ${annotation.text}`;
                }).join("\n") || "Nenhum erro encontrado",
            ),
            thumbnail: userBot?.displayAvatarURL() || ownerUser?.displayAvatarURL() || client.users.cache.get(analyserId)?.displayAvatarURL() || "",
        }),
        createSeparator(),
        brBuilder(
            `## ( ${icon.pencil} ╺╸ Erros ortográficos encontrados durante a análise:`,
            annotations.filter(e => e.type === "ortographic").map((annotation, index) => {
                return `> ${index + 1}. ${annotation.text}`;
            }).join("\n") || "Nenhum erro ortográfico encontrado",
        ),
        createSeparator(),
        brBuilder(
            `## ( ${icon.search} ╺╸ Avaliação:`,
            justification
        ),
        brBuilder(
            `-# Avaliador: ${userMention(analyserId)} | Data: ${time(new Date(), "F")}`,
            `-# ╰ ID da análise: ${analyseId}`,
            `-#    ╰ Tempo de análise: ${formatElapsedTime(createdAt)}`,
        )
    ];
}

export default async function endAnalise(interaction: ChatInputCommandInteraction<"cached">) {
    await interaction.deferReply();

    const approved = interaction.options.getBoolean("aprovado", true);
    const justification = interaction.options.getString("justificativa", true);
    const rootPath = `${process.cwd()}/threads.json`;
    const backupPath = `${process.cwd()}/threads_backup.json`;

    try {
        // Verificar se o usuário é avaliador e está analisando algo
        const user = await prisma.user.findUnique({
            where: { id: interaction.user.id },
        });

        if (!user?.isAvaliator) {
            return await interaction.editReply(res.danger("Você não é um analisador!"));
        }

        if (!user?.analisingId) {
            return await interaction.editReply(res.danger("Você não está analisando nenhum bot!"));
        }

        // Buscar análise
        const analyse = await prisma.analyze.findUnique({
            where: { id: user.analisingId },
            include: { annotations: true, application: true },
        });

        if (!analyse || !analyse.application || !analyse.applicationId) {
            await prisma.user.update({
                where: { id: interaction.user.id },
                data: { analisingId: null },
            });
            return await interaction.editReply(res.danger("A análise ou a aplicação associada não foi encontrada. Você não está mais analisando nenhum bot!"));
        }

        if (analyse.finishedIn) {
            await prisma.user.update({
                where: { id: interaction.user.id },
                data: { analisingId: null },
            });
            return await interaction.editReply(res.danger("Esta análise já foi finalizada anteriormente!"));
        }

        // Criar backup do threads.json
        if (!existsSync(rootPath)) {
            await fs.writeFile(rootPath, JSON.stringify({}, null, 4));
            console.log(`Arquivo ${rootPath} criado`);
        }
        console.log(`Criando backup em ${backupPath}`);
        await fs.copyFile(rootPath, backupPath);
        console.log(`Backup criado com sucesso`);

        // Transação principal
        await prisma.$transaction(async (tx) => {
            try {
                if (approved) {
                    // Atualizar análise e limpar analisingId
                    await Promise.all([
                        tx.analyze.update({
                            where: { id: user.analisingId! },
                            data: { finishedIn: new Date(), approved: true, avaliation: justification },
                        }),
                        tx.user.update({
                            where: { id: interaction.user.id },
                            data: { analisingId: null },
                        }),
                        tx.application.update({
                            where: { id: analyse.applicationId! },
                            data: { analyzeId: analyse.id },
                        })
                    ]);

                    // Adicionar cargos
                    const principalGuild = await interaction.client.guilds.fetch(settings.guild.principalId);
                    const [botMember, ownerMember] = await Promise.all([
                        principalGuild.members.fetch(analyse.application!.id).catch(() => null),
                        principalGuild.members.fetch(analyse.application!.userId).catch(() => null),
                    ]);

                    if (!ownerMember) {
                        throw new Error("Dono do bot não encontrado no servidor principal.");
                    }

                    await Promise.all([
                        botMember ? botMember.roles.add(settings.guild.roles.roleBotAprroved).catch(() => null) : null,
                        ownerMember.roles.add(settings.guild.roles.devRole).catch(() => null),
                    ]);

                    // Enviar mensagem no canal de requests
                    const channelId = settings.guild.channels.requests;
                    const channel = await interaction.client.channels.fetch(channelId);

                    if (channel?.isTextBased() && "send" in channel) {
                        const components = buildAnalysisComponents(
                            analyse.application!.userId,
                            analyse.application!.id,
                            interaction.user.id,
                            analyse.id.toString(),
                            justification,
                            analyse.annotations,
                            true,
                            analyse.createdAt,
                            interaction.client
                        );
                        const container = createContainer({
                            accentColor: settings.colors.success,
                            components,
                        });
                        await channel.send({ components: [container], flags: ["IsComponentsV2"] });
                    } else {
                        throw new Error("Falha ao enviar a mensagem no canal de requests.");
                    }
                } else {
                    // Reprovar: excluir aplicação e limpar analisingId
                    await Promise.all([
                        tx.user.update({
                            where: { id: interaction.user.id },
                            data: { analisingId: null },
                        }),
                        tx.analyze.update({
                            where: { id: user.analisingId! },
                            data: { finishedIn: new Date(), approved: false, applicationId: null, avaliation: justification },
                        }),
                        tx.application.delete({
                            where: { id: analyse.applicationId! },
                        }),
                    ]);

                    // Expulsar bot
                    const [principalGuild, sandboxGuild] = await Promise.all([
                        interaction.client.guilds.fetch(settings.guild.principalId),
                        interaction.client.guilds.fetch(settings.guild.sandboxId),
                    ]);

                    await Promise.all([
                        principalGuild.members
                            .fetch(analyse.application!.id)
                            .then(member => member.kick("Bot reprovado"))
                            .catch(() => null),
                        sandboxGuild.members
                            .fetch(analyse.application!.id)
                            .then(member => member.kick("Bot reprovado"))
                            .catch(() => null),
                    ]);

                    // Enviar mensagem no canal de requests
                    const channelId = settings.guild.channels.requests;
                    const channel = await interaction.client.channels.fetch(channelId);

                    if (channel?.isTextBased() && "send" in channel) {
                        const components = buildAnalysisComponents(
                            analyse.application!.userId,
                            analyse.application!.id,
                            interaction.user.id,
                            analyse.id.toString(),
                            justification,
                            analyse.annotations,
                            false,
                            analyse.createdAt,
                            interaction.client
                        );

                        let removedComponents: any[] = [];
                        const messageContent = components.join("\n");
                        if (messageContent.length > 3000) {
                            removedComponents = components.splice(-5);
                        }

                        const container = createContainer({
                            accentColor: settings.colors.danger,
                            components,
                        });

                        await channel.send({ components: [container], flags: ["IsComponentsV2"] });

                        if (removedComponents.length > 0) {
                            const removedContainer = createContainer({
                                accentColor: settings.colors.danger,
                                components: removedComponents,
                            });
                            await channel.send({ components: [removedContainer], flags: ["IsComponentsV2"] });
                        }
                    } else {
                        throw new Error("Falha ao enviar a mensagem no canal de requests.");
                    }
                }
            } catch (error) {
                throw new Error(`Erro no banco de dados, cargos ou envio de mensagem: ${(error as Error).message}`);
            }
        });

        // Atualizar threads.json
        try {
            console.log(`Lendo ${rootPath} para atualização`);
            const preview: { [key: string]: { replicated: string } } = JSON.parse(await fs.readFile(rootPath, "utf-8"));
            const threadId = interaction.channelId;

            if (preview[threadId]) {
                delete preview[threadId];
                await fs.writeFile(rootPath, JSON.stringify(preview, null, 4));
                console.log(`Arquivo ${rootPath} atualizado com sucesso`);
            }
        } catch (error: unknown) {
            console.error(`Erro ao atualizar ${rootPath}:`, (error as Error).message);
            await fs.copyFile(backupPath, rootPath);
            console.log(`Backup restaurado em ${rootPath}`);
            throw new Error(`Erro ao atualizar o arquivo threads.json: ${(error as Error).message}`);
        }

        // Resposta final
        await interaction.editReply(res.success("Análise finalizada com sucesso!"));
    } catch (error: unknown) {
        console.error("Erro ao finalizar análise:", error);
        if (existsSync(backupPath)) {
            try {
                await fs.copyFile(backupPath, rootPath);
                console.log(`Backup restaurado em ${rootPath}`);
            } catch (restoreError: unknown) {
                console.error("Erro ao restaurar backup:", (restoreError as Error).message);
            }
        }
        await interaction.editReply(res.danger(`Ocorreu um erro: ${(error as Error).message}`));
    } finally {
        await tryUnlinkWithRetry(backupPath);
    }
    return;
}

function formatElapsedTime(startDate: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - startDate.getTime();

    const seconds = Math.floor((diffMs / 1000) % 60);
    const minutes = Math.floor((diffMs / (1000 * 60)) % 60);
    const hours = Math.floor(diffMs / (1000 * 60 * 60));

    const parts: string[] = [];

    if (hours > 0) {
        parts.push(`${hours} ${hours === 1 ? "hora" : "horas"}`);
    }
    if (minutes > 0) {
        parts.push(`${minutes} ${minutes === 1 ? "minuto" : "minutos"}`);
    }
    if (seconds > 0 || (hours === 0 && minutes === 0)) {
        parts.push(`${seconds} ${seconds === 1 ? "segundo" : "segundos"}`);
    }

    if (parts.length === 0) {
        return "0 segundos";
    }

    if (parts.length === 1) {
        return parts[0];
    }

    if (parts.length === 2) {
        return `${parts[0]} e ${parts[1]}`;
    }

    return `${parts[0]}, ${parts[1]} e ${parts[2]}`;
}
import { prisma } from "#database";
import { icon, res } from "#functions";
import { settings } from "#settings";
import { brBuilder, createContainer, createEmbed, createSection, createSeparator } from "@magicyan/discord";
import { ChatInputCommandInteraction, ColorResolvable, time, userMention } from "discord.js";
import fs from "fs";

export default async function endAnalise(interaction: ChatInputCommandInteraction<"cached">) {
    const approved = interaction.options.getBoolean("aprovado", true);
    const justification = interaction.options.getString("justificativa", true);

    await interaction.deferReply();

    const user = await prisma.user.findUnique({
        where: {
            id: interaction.user.id
        }
    });

    if (!user?.isAvaliator) {
        await interaction.editReply("Você não é um avaliador!");
        return;
    }
    if (!user?.analising) {
        await interaction.editReply("Você não está analisando nenhum bot!");
        return;
    }

    const channelId = settings.guild.channels.requests;

    const annotations = await prisma.annotation.findMany({
        where: {
            userId: interaction.user.id,
            applicationId: user.analising,
        }
    });

    const principalGuild = await interaction.client.guilds.fetch(settings.guild.principalId);
    const sandboxGuild = await interaction.client.guilds.fetch(settings.guild.sandboxId);

    if (approved) {
        const [application] = await prisma.$transaction([
            prisma.application.update({
                where: {
                    id: user.analising
                },
                data: {
                    avaliation: justification
                }
            }),
            prisma.user.update({
                where: {
                    id: interaction.user.id
                },
                data: {
                    analising: null
                }
            })
        ]);
    
        try {
            const botUser = await principalGuild.members.fetch(user.analising).catch(() => null);
            const botOwner = await principalGuild.members.fetch(application.userId).catch(() => null);

            if (botUser) {
                await botUser.roles.add(settings.guild.roles.roleBotAprroved).catch(console.error);
            } else {
                console.log(`Bot ${user.analising} não encontrado no servidor principal`);
            }
    
            if (botOwner) {
                await botOwner.roles.add(settings.guild.roles.devRole).catch(console.error);
            } else {
                console.log(`Dono do bot ${application.userId} não encontrado no servidor principal`);
            }

            const ownerUser = await interaction.client.users.fetch(application.userId).catch(() => null);
            const userBot = await interaction.client.users.fetch(user.analising).catch(() => null);
            const components = [
                `${!ownerUser ? "Não encontrado" : userMention(ownerUser.id)} - **${icon.approved} | Seu bot foi aprovado!**`,
                createSeparator(),
                createSection({
                    content: brBuilder(
                        `## ( ${icon.bug} ╺╸ Erros encontrados durante a analise:`,
                        annotations.filter(e => e.type === "error").map((annotation, index) => {
                            return `> ${index + 1}. ${annotation.text}`;
                        }).join("\n") || "Nenhum erro encontrado",
                    ),
                    thumbnail: userBot?.displayAvatarURL() || ownerUser?.displayAvatarURL() || interaction.user.displayAvatarURL(),
                }),
                createSeparator(),
                brBuilder(
                    `## ( ${icon.pencil} ╺╸ Erros ortográficos encontrados durante a analise:`,
                    annotations.filter(e => e.type === "ortographic").map((annotation, index) => {
                        return `> ${index + 1}. ${annotation.text}`;
                    }).join("\n") || "Nenhum erro ortográfico encontrado",
                ),
                createSeparator(),
                brBuilder(
                    `## ( ${icon.search} ╺╸ Avaliação:`,
                    justification
                ),
                `-# Avaliador: ${userMention(interaction.user.id)} | Data: ${time(new Date(), "F")}`,
            ]
        
            const container = createContainer({
                accentColor: settings.colors.success,
                components
            })

            await interaction.client.channels.fetch(channelId).then(async channel => {
                if (channel?.isTextBased() && 'send' in channel) {
                    await channel.send({ components: [container], flags: ["IsComponentsV2"] });
                }
            })
        } catch (e) {
            console.error("Erro ao adicionar cargos:", e);
        }
    } else {
        const [application] = await prisma.$transaction([
            prisma.application.findUnique({
                where: {
                    id: user.analising
                }
            }),
            prisma.annotation.deleteMany({
                where: {
                    userId: interaction.user.id,
                    applicationId: user.analising
                }
            }),
            prisma.user.update({
                where: {
                    id: interaction.user.id
                },
                data: {
                    analising: null
                }
            }),
            prisma.application.delete({
                where: {
                    id: user.analising
                }
            })
        ])

        const ownerUser = await interaction.client.users.fetch(application?.userId || "").catch(() => null);
        const userBot = await interaction.client.users.fetch(user.analising).catch(() => null);

        const components = [
            `${!ownerUser ? "Não encontrado" : userMention(ownerUser.id)} - **${icon.approved} | Seu bot foi reprovado!**`,
            createSeparator(),
            createSection({
                content: brBuilder(
                    `## ( ${icon.bug} ╺╸ Erros encontrados durante a analise:`,
                    annotations.filter(e => e.type === "error").map((annotation, index) => {
                        return `> ${index + 1}. ${annotation.text}`;
                    }).join("\n") || "Nenhum erro encontrado",
                ),
                thumbnail: userBot?.displayAvatarURL() || ownerUser?.displayAvatarURL() || interaction.user.displayAvatarURL(),
            }),
            createSeparator(),
            brBuilder(
                `## ( ${icon.pencil} ╺╸ Erros ortográficos encontrados durante a analise:`,
                annotations.filter(e => e.type === "ortographic").map((annotation, index) => {
                    return `> ${index + 1}. ${annotation.text}`;
                }).join("\n") || "Nenhum erro ortográfico encontrado",
            ),
            createSeparator(),
            brBuilder(
                `## ( ${icon.search} ╺╸ Avaliação:`,
                justification
            ),
            `-# Avaliador: ${userMention(interaction.user.id)} | Data: ${time(new Date(), "F")}`,
        ]
    
        const container = createContainer({
            accentColor: settings.colors.danger,
            components
        })

        let removedComponents: any[] = [];

        if (annotations.join("\n").length + justification.length > 3000) {
            removedComponents = components.splice(-5);
        }
        
        await interaction.client.channels.fetch(channelId).then(async channel => {
            if (channel?.isTextBased() &&'send' in channel) {
                await channel.send({ components: [container], flags: ["IsComponentsV2"] });
                if (removedComponents.length > 0) {
                    const removedContainer = createContainer({
                        accentColor: settings.colors.danger,
                        components: removedComponents
                    })
                    await channel.send({ components: [removedContainer], flags: ["IsComponentsV2"] });
                }
            }
        })
        try {
            // Verificar se o bot está no sandbox antes de tentar expulsar
            const sandboxMember = await sandboxGuild.members.fetch(user.analising).catch(() => null);
            if (sandboxMember) {
                await sandboxGuild.members.kick(user.analising, "Bot reprovado");
            }

            // Verificar se o bot está no servidor principal antes de tentar expulsar
            const principalMember = await principalGuild.members.fetch(user.analising).catch(() => null);
            if (principalMember) {
                await principalGuild.members.kick(user.analising, "Bot reprovado");
            }
        } catch (e) {
            console.error("Erro ao expulsar bot:", e);
        }
    }

    try {
        const rootPath = `${process.cwd()}/threads.json`;

        const thread: string[] = JSON.parse(fs.readFileSync(rootPath, "utf8"));

        const index = thread.indexOf(channelId);

        thread.splice(index, 1);

        fs.writeFileSync(rootPath, JSON.stringify(thread, null, 4));
    } catch (e) {
        console.log(e);
    }

    interaction.editReply(res.success("Analise enviada com sucesso!"));
}

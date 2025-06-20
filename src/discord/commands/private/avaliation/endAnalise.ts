import { prisma } from "#database";
import { res } from "#functions";
import { settings } from "#settings";
import { createEmbed } from "@magicyan/discord";
import { ChatInputCommandInteraction, ColorResolvable, userMention } from "discord.js";
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

    const embed = createEmbed({
        title: "Bot Aprovado",
        description: `O bot <@${user.analising}> foi aprovado por <@${interaction.user.id}>`,
        fields: [
            {
                name: "Erros encontrados",
                value: (() => {
                    const errorAnnotations = annotations.filter(a => a.type === "error");
                    if (errorAnnotations.length === 0) {
                        return "Nenhum erro encontrado";
                    }
                    return errorAnnotations.map((a, i) => `${i + 1}. | \`${a.text}\``).join("\n");
                })()
            },
            {
                name: "Erros ortográficos encontrados",
                value: (() => {
                    const spellingAnnotations = annotations.filter(a => a.type === "ortographic");
                    if (spellingAnnotations.length === 0) {
                        return "Nenhum erro ortográfico encontrado";
                    }
                    return spellingAnnotations.map((a, i) => `${i + 1}. | \`${a.text}\``).join("\n");
                })()
            },
            {
                name: "Analise",
                value: justification
            },
        ],
        color: settings.colors.success,
        footer: {
            text: `Analisado por: ${interaction.user.displayName}`,
            iconURL: interaction.user.displayAvatarURL()
        },
        timestamp: new Date().toISOString()
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
        } catch (e) {
            console.error("Erro ao adicionar cargos:", e);
        }

        await interaction.client.channels.fetch(channelId).then(async channel => {
            if (channel?.isTextBased() && 'send' in channel) {
                await channel.send({ embeds: [embed], content: userMention(application.userId)  });
            }
        })
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

        embed.setTitle("Bot Reprovado");
        embed.setColor(settings.colors.danger as ColorResolvable);
        embed.setDescription(`O bot <@${user.analising}> foi reprovado por <@${interaction.user.id}>`);
        await interaction.client.channels.fetch(channelId).then(async channel => {
            if (channel?.isTextBased() &&'send' in channel) {
                await channel.send({ embeds: [embed], content: application?.userId ? userMention(application.userId) : "" });
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

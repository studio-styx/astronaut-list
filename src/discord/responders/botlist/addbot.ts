import { createResponder, ResponderType } from "#base";
import { prisma } from "#database";
import { clearBotInfo, res } from "#functions";
import { ButtonBuilder, ButtonStyle, MessageFlags, roleMention, StringSelectMenuBuilder, TextInputStyle } from "discord.js";
import { brBuilder, createContainer, createEmbed, createModalFields, createRow, createSection, createSeparator } from "@magicyan/discord";
import { getBotInfo, setBotInfo } from "#functions";
import { settings } from "#settings";

createResponder({
    customId: "botlist/addbot/:step",
    types: [ResponderType.Button, ResponderType.StringSelect, ResponderType.ModalComponent], cache: "cached",
    async run(interaction, { step }) {
        switch (step) {
            case "1": {
                if (interaction.isStringSelectMenu()) return;
                await interaction.deferReply({ flags });

                const userApps = await prisma.application.findMany({
                    where: {
                        userId: interaction.user.id,
                        avaliation: null
                    }
                })

                if (userApps.length > 0) {
                    interaction.editReply(res.danger("Você já tem uma aplicação em andamento!"));
                    return;
                }

                const embed = createEmbed({
                    title: "Adicionar Aplicação",
                    description: "Qual a linguagem da sua aplicação?",
                    timestamp: new Date().toISOString(),
                    color: "#DDA200"
                })

                try {
                    const selectMenu = createRow([
                        new StringSelectMenuBuilder({
                            custom_id: "botlist/addbot/2",
                            placeholder: "Selecione a linguagem",
                            min_values: 1,
                            max_values: 1,
                            options: [
                                { label: "BDFD", value: "bdfd"  },
                                { label: "Aoi.js", value: "aoijs" },
                                { label: "JavaScript", value: "javascript" },
                                { label: "TypeScript", value: "typescript" },
                                { label: "Python", value: "python" },
                                { label: "Java", value: "java" },
                                { label: "Kotlin", value: "kotlin" },
                                { label: "C#", value: "csharp" },
                                { label: "C++", value: "cpp" },
                                { label: "Ruby", value: "ruby" },
                                { label: "Go", value: "go" },
                                { label: "Rust", value: "rust" },
                            ]
                        })
                    ])
                    
                    try {
                        interaction.editReply({ embeds: [embed], components: [selectMenu] })
                    } catch (error) {
                        console.error("error" + error)
                        interaction.editReply(res.danger("Ocorreu um erro ao enviar a mensagem!"));
                    }
                } catch (error) {
                    console.error("error" + error)
                    interaction.editReply(res.danger("Ocorreu um erro ao enviar a mensagem!"));
                }
                return;
            }
            case "2": {
                if (!interaction.isStringSelectMenu()) return;
                await interaction.deferUpdate();

                const language = interaction.values[0] as "bdfd" | "aoijs" | "javascript" | "typescript" | "python" | "java" | "kotlin" | "csharp" | "cpp" | "ruby" | "go" | "rust";

                const embed = createEmbed({
                    title: "Adicionar Aplicação",
                    description: "Qual biblioteca seu bot usa?",
                    color: "#DDA200",
                    timestamp: new Date().toISOString(),
                })

                const libs = {
                    javascript: [
                        { label: "Discord.js", value: "discord.js" },
                        { label: "Oceanic.js", value: "oceanic.js" },
                        { label: "Eris", value: "eris" },
                        { label: "Outro", value: "outro" }
                    ],
                    typescript: [
                        { label: "Discord.js", value: "discord.js" },
                        { label: "Oceanic.js", value: "oceanic.js" },
                        { label: "Eris", value: "eris" },
                        { label: "Outro", value: "outro" }
                    ],
                    python: [
                        { label: "Discord.py", value: "discord.py" },
                        { label: "NextCord", value: "nextcord" },
                        { label: "PyCord", value: "pycord" },
                        { label: "Hikari", value: "hikari" },
                        { label: "Outro", value: "outro" }
                    ],
                    java: [
                        { label: "JDA", value: "jda" },
                        { label: "Outro", value: "outro" }
                    ],
                    kotlin: [
                        { label: "Kord", value: "kord" },
                        { label: "JDA", value: "jda" },
                        { label: "Outro", value: "outro" }
                    ],
                    csharp: [
                        { label: "DisCatSharp", value: "discatsharp" },
                        { label: "Discord.Net", value: "discord.net" },
                        { label: "NetCord", value: "netcord" },
                        { label: "DSharpPlus", value: "dsharpplus" },
                        { label: "Outro", value: "outro" }
                    ],
                    cpp: [
                        { label: "D++", value: "dpp" },
                        { label: "Outro", value: "outro" }
                    ],
                    ruby: [
                        { label: "Discordb", value: "discordb" },
                        { label: "Discordrb", value: "discordrb" },
                        { label: "Outro", value: "outro" }
                    ],
                    go: [
                        { label: "Discordgo", value: "discordgo" },
                        { label: "Disgo", value: "disgo" },
                        { label: "Outro", value: "outro" }
                    ],
                    rust: [
                        { label: "Serenity", value: "serenity" },
                        { label: "Discord.rs", value: "discord.rs" },
                        { label: "Twilight", value: "twilight" },
                        { label: "Outro", value: "outro" }
                    ]
                }

                if (language === "bdfd" || language === "aoijs") {
                    const embed = createEmbed({
                        title: "Adicionar Aplicação",
                        description: "Quase lá! Aperte no botão abaixo para responder as perguntas finais.",
                        color: "#DDA200",
                        timestamp: new Date().toISOString(),
                    })

                    const button = createRow(
                        new ButtonBuilder({
                            customId: "botlist/addbot/4",
                            label: "Adicionar Aplicação",
                            style: ButtonStyle.Success
                        })
                    )

                    if (language === "bdfd") {
                        setBotInfo(interaction.user.id, {
                            language: "bdfd",
                            lib: "dbfd2"
                        })
                    } else {
                        setBotInfo(interaction.user.id, {
                            language: "javascript",
                            lib: "aoi.js"
                        })
                    }

                    interaction.editReply({ embeds: [embed], components: [button] })
                    return;
                }

                const selectMenu = createRow([
                    new StringSelectMenuBuilder({
                        custom_id: "botlist/addbot/3",
                        placeholder: "Selecione a biblioteca",
                        min_values: 1,
                        max_values: 1,
                        options: libs[language]
                    })
                ]);

                interaction.editReply({ embeds: [embed], components: [selectMenu] })

                setBotInfo(interaction.user.id, {
                    language: language
                })
                return;
            }
            case "3": {
                let lib = "";
                if (interaction.isStringSelectMenu()) {
                    lib = interaction.values[0];

                    if (lib === "outro") {
                        interaction.showModal({
                            customId: "botlist/addbot/3",
                            title: "Adicionar Aplicação",
                            components: createModalFields({
                                lib: {
                                    label: "Qual biblioteca seu bot usa?",
                                    placeholder: "Digite a biblioteca",
                                    style: TextInputStyle.Short,
                                    required: true,
                                }
                            })
                        })
                        return;
                    }
                } else if (interaction.isModalSubmit()) {
                    lib = interaction.fields.getTextInputValue("lib");
                }
                await interaction.deferUpdate();

                setBotInfo(interaction.user.id, {
                    lib
                })

                const embed = createEmbed({
                    title: "Adicionar Aplicação",
                    description: "Quase lá! Aperte no botão abaixo para responder as perguntas finais.",
                    color: "#DDA200",
                    timestamp: new Date().toISOString(),
                })

                const button = createRow(
                    new ButtonBuilder({
                        customId: "botlist/addbot/4",
                        label: "Adicionar Aplicação",
                        style: ButtonStyle.Success
                    })
                )

                interaction.editReply({ embeds: [embed], components: [button] })
                return;
            }
            case "4": {
                if (interaction.isButton()) {
                    interaction.showModal({
                        customId: "botlist/addbot/4",
                        title: "Adicionar Aplicação",
                        components: createModalFields({
                            id: {
                                label: "Qual o ID do seu bot?",
                                placeholder: "Digite o ID",
                                style: TextInputStyle.Short,
                                required: true,
                            },
                            prefix: {
                                label: "Prefixo (/ se for slash)",
                                placeholder: "Digite o prefixo",
                                style: TextInputStyle.Short,
                                maxLength: 3,
                                minLength: 1,
                                required: true,
                            },
                            prefix2: {
                                label: "Segundo prefixo (opcional)",
                                placeholder: "Digite o prefixo",
                                style: TextInputStyle.Short,
                                maxLength: 3,
                                minLength: 1,
                                required: false,
                            },
                            description: {
                                label: "Qual a descrição do seu bot?",
                                placeholder: "Digite a descrição",
                                style: TextInputStyle.Paragraph,
                                required: false,
                            },
                        })
                    })
                    return;
                }
                if (interaction.isStringSelectMenu()) return;
                await interaction.deferUpdate();

                const id = interaction.fields.getTextInputValue("id");
                const prefix = interaction.fields.getTextInputValue("prefix");
                const prefix2 = interaction.fields.getTextInputValue("prefix2") || undefined;
                const description = interaction.fields.getTextInputValue("description") || undefined;

                const botInfo = setBotInfo(interaction.user.id, {
                    id,
                    prefix,
                    prefix2,
                    description
                })

                const embed = createEmbed({
                    title: "Adicionar Aplicação",
                    description: brBuilder(
                        "Está tudo certo? confira abaixo:",
                        `**ID:** \`${botInfo.id}\``,
                        `**Prefixo:** \`${botInfo.prefix}\``,
                        `**Prefixo 2:** \`${botInfo.prefix2 || "Não definido"}\``,
                        `**Descrição:** \`${botInfo.description || "Não definido"}\``,
                        `**Linguagem:** \`${botInfo.language}\``,
                        `**Biblioteca:** \`${botInfo.lib}\``,
                        "-# Se algo tiver errado você pode apertar novamente em enviar aplicação no embed original e fazer novamente o processo.",
                        "-# Se tudo estiver certo clique no botão abaixo para enviar a aplicação."
                    ),
                    timestamp: new Date().toISOString(),
                    color: "#DDA200",
                })

                const button = createRow(
                    new ButtonBuilder({
                        customId: "botlist/addbot/5",
                        label: "Enviar",
                        style: ButtonStyle.Success
                    })
                )

                interaction.editReply({ embeds: [embed], components: [button] })
                return;
            }
            case "5": {
                if (!interaction.isButton()) return;
                await interaction.deferUpdate();

                const botInfo = getBotInfo(interaction.user.id)

                if (!botInfo) {
                    interaction.editReply(res.danger("Ocorreu um erro ao enviar a aplicação! verifique se não demorou demais para enviar a aplicação, e tente novamente.", { components: [] }));
                    return;
                }

                const botDiscordInfo = await interaction.client.users.fetch(botInfo.id || '').catch(() => null);

                const channel = interaction.client.channels.cache.get(settings.guild.solicitations) as any;

                const container = createContainer({
                    accentColor: settings.colors.success,
                    components: [
                        `### Nova aplicação`,
                        brBuilder(
                            `**Dono do bot:** <@${interaction.user.id}>`,
                            `**ID:** \`${botInfo.id}\``,
                            `**Prefixo:** \`${botInfo.prefix}\``,
                            botInfo.prefix2 ? `**Prefixo 2:** \`${botInfo.prefix2}\`` : null,
                            `**Linguagem:** \`${botInfo.language}\``,
                            `**Biblioteca:** \`${botInfo.lib}\``,
                            `**Descrição:** \`${botInfo.description || "nenhuma descrição fornecida"}\``,
                            ``
                        ),
                        createSeparator(),
                        `### Informações que eu encontrei sobre a aplicação:`,
                        createSection({
                            content: brBuilder(
                                `**Nome:** \`${botDiscordInfo?.username || "Não encontrado"}\``,
                                `**Tag:** \`${botDiscordInfo?.tag || "Não encontrado"}\``,
                                `**ID:** \`${botDiscordInfo?.id || "Não encontrado"}\``,
                                `**Criado em:** ${botDiscordInfo?.createdTimestamp ? `<t:${Math.floor(botDiscordInfo?.createdTimestamp! / 1000)}:F>` : '`Não encontrado`'}`,
                                `**Avatar:** ${botDiscordInfo?.avatarURL() ? `[Aperte aqui para ver](${botDiscordInfo?.avatarURL()})` : '`Não encontrado`'}`,
                            ),
                            thumbnail: botDiscordInfo?.avatarURL() || interaction.user.displayAvatarURL(),
                        })
                    ]
                })

                const component = createRow(
                    new ButtonBuilder({
                        url: `https://discord.com/oauth2/authorize?client_id=${botInfo.id}&scope=bot&permissions=0`,
                        label: "Adicionar ao servidor",
                        style: ButtonStyle.Link
                    }),
                )

                channel.send({
                    components: [container, component],
                    flags: MessageFlags.IsComponentsV2
                })

                const embed = createEmbed({
                    title: "Adicionar Aplicação",
                    description: "Aplicação enviada com sucesso!",
                    color: settings.colors.success,
                    timestamp: new Date().toISOString(),
                })

                const alreadyExisting = await prisma.application.findUnique({
                    where: {
                        id: botInfo.id!,
                    }
                })

                if (alreadyExisting) {
                    interaction.editReply(res.danger("Você já enviou uma aplicação com esse id!", { components: [] }));
                    clearBotInfo(interaction.user.id);
                    return;
                }

                await prisma.user.upsert({
                    where: {
                        id: interaction.user.id,
                    },
                    update: {},
                    create: {
                        id: interaction.user.id,
                    }
                })

                await prisma.application.create({
                    data: {
                        id: botInfo.id!,
                        userId: interaction.user.id,
                        name: botDiscordInfo?.username!,
                        prefix: botInfo.prefix!,
                        prefix2: botInfo.prefix2!,
                        description: botInfo.description,
                        language: botInfo.language!,
                        lib: botInfo.lib!,
                    }
                })

                interaction.editReply({
                    embeds: [embed],
                    components: [],
                    content: roleMention("1374888824777474098")
                })

                clearBotInfo(interaction.user.id);
                return;
            }
        }
    },
});
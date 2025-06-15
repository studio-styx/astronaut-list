import { createCommand } from "#base";
import { res } from "#functions";
import { settings } from "#settings";
import { createEmbed } from "@magicyan/discord";
import { ApplicationCommandType } from "discord.js";

createCommand({
    name: "permissions",
    description: "verifica as permissões do bot",
    type: ApplicationCommandType.ChatInput,
    async run(interaction){
        if (interaction.user.id !== "1171963692984844401") {
            interaction.reply("você não pode usar esse comando");
            return;
        }

        await interaction.deferReply({ flags });
        await interaction.editReply(res.warning("verificando permissões..."));

        try {
            const guildChannels = await interaction.guild.channels.fetch();
    
            const noPermissions: string[] = [];
            const hasPermissions: string[] = [];
            const erros: string[] = [];

            for (const channel of guildChannels.values()) {
                console.log("verificando:", channel?.id, "-", channel?.name, "verificando permissões...");
                try {
                    if (channel?.isTextBased()) {
                        const permissions = channel.permissionsFor(interaction.client.user);
                        if (!permissions?.has("SendMessages")) {
                            noPermissions.push(`<#${channel.id}> não tenho permissão para enviar mensagens`);
                            console.log(channel?.name, "não tenho permissão para enviar mensagens");
                        }
                        if (!permissions?.has("ViewChannel")) {
                            noPermissions.push(`<#${channel.id}> não tenho permissão para ver o canal`);
                            console.log(channel?.name, "não tenho permissão para ver o canal");
                        }
                        if (!permissions?.has("EmbedLinks")) {
                            noPermissions.push(`<#${channel.id}> não tenho permissão para enviar embeds`);
                            console.log(channel?.name, "não tenho permissão para enviar embeds");
                        }
                        if (!permissions?.has("AttachFiles")) {
                            noPermissions.push(`<#${channel.id}> não tenho permissão para enviar arquivos`);
                            console.log(channel?.name, "não tenho permissão para enviar arquivos");
                        }

                        // hasPermissions

                        if (permissions?.has("SendMessages")) {
                            hasPermissions.push(`<#${channel.id}> tenho permissão para enviar mensagens`);
                            console.log(channel?.name, "tenho permissão para enviar mensagens");
                        }
                        if (permissions?.has("ViewChannel")) {
                            hasPermissions.push(`<#${channel.id}> tenho permissão para ver o canal`);
                            console.log(channel?.name, "tenho permissão para ver o canal");
                        }
                        if (permissions?.has("EmbedLinks")) {
                            hasPermissions.push(`<#${channel.id}> tenho permissão para enviar embeds`);
                            console.log(channel?.name, "tenho permissão para enviar embeds");
                        }
                        if (permissions?.has("AttachFiles")) {
                            hasPermissions.push(`<#${channel.id}> tenho permissão para enviar arquivos`);
                            console.log(channel?.name, "tenho permissão para enviar arquivos");
                        }
                    }
                } catch (e: any) {
                    console.log(e);
                    erros.push(`<#${channel?.id}> um erro ocorreu ao verificar as permissões do canal: ${e.message}`);
                }
            }

            async function sendLongEmbedReply(
                interaction: any,
                description: string,
                color: keyof typeof settings.colors,
                isFollowUp = true
            ) {
                const MAX_LENGTH = 4096;
                const lines = description.split("\n");
                let buffer = "";
                const embeds = [];

                for (const line of lines) {
                    if ((buffer + line + "\n").length > MAX_LENGTH) {
                        embeds.push(createEmbed({ color: settings.colors[color], description: buffer }));
                        buffer = "";
                    }
                    buffer += line + "\n";
                }

                if (buffer.trim()) {
                    embeds.push(createEmbed({ color: settings.colors[color], description: buffer }));
                }

                // Envia o primeiro com editReply ou followUp
                const method = isFollowUp ? interaction.followUp : interaction.editReply;
                await method.call(interaction, { embeds: [embeds.shift()] });

                // Envia os restantes como followUp
                for (const e of embeds) {
                    await interaction.followUp({ embeds: [e], flags });
                }
            }

            await sendLongEmbedReply(interaction, `Canais que possuo permissões:\n${hasPermissions.join("\n")}`, "success", false);
            await sendLongEmbedReply(interaction, `Canais que não possuo permissões:\n${noPermissions.join("\n")}`, "danger");
            if (erros.length > 0) {
                await sendLongEmbedReply(interaction, `Erros ao verificar as permissões dos canais:\n${erros.join("\n")}`, "warning");
            }
        } catch (e: any) {
            console.log(e);
            interaction.editReply(res.danger(`Erro ao verificar permissões: ${e.message}`));
        }
    }
});
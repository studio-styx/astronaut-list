import { createCommand } from "#base";
import { getCommandId } from "#functions";
import { settings } from "#settings";
import { brBuilder, createEmbed } from "@magicyan/discord";
import { ApplicationCommandType } from "discord.js";

createCommand({
    name: "help",
    description: "mostra os comandos do bot",
    type: ApplicationCommandType.ChatInput,
    async run(interaction){
        await interaction.deferReply();
        const getId = async (commandName: string) => {
            return await getCommandId(interaction, commandName);
        }

        const botCommandId = await getId("bot");
        const analisatorCommandId = await getId("analisator");
        const embed = createEmbed({
            title: "Comandos",
            description: "Lista de comandos do bot",
            fields: [
                {
                    name: "Público",
                    value: brBuilder(
                        `</bot votar:${botCommandId}> - votar em alguma aplicação`,
                        `</bot editar:${botCommandId}> - editar a descrição do seu bot`,
                        `</bot votar:${botCommandId}> - votar em alguma aplicação`,
                        `</bot ranking:${botCommandId}> - ver o ranking de votos dos bots`,
                        `</bot info:${botCommandId}> - ver as informações de algum bot`,
                        `</daily:${await getId("daily")}> - receber o daily diário`,
                        `</analisator listar-analisadores:${analisatorCommandId}> - listar os analisadores`,
                    )
                },
                {
                    name: "Analisador",
                    value: brBuilder(
                        `</analisator analise iniciar:${analisatorCommandId}> - iniciar a analise de um bot`,
                        `</analisator analise finalizar:${analisatorCommandId}> - finalizar a analise de um bot`,
                        `</analisator analise cancelar:${analisatorCommandId}> - cancelar a analise de um bot`,
                        '',
                        `</analisator erros-tecnicos adicionar:${analisatorCommandId}> - adicionar um erro técnico ao bot`,
                        `</analisator erros-tecnicos remover:${analisatorCommandId}> - remover um erro técnico do bot`,
                        `</analisator erros-tecnicos listar:${analisatorCommandId}> - listar os erros técnicos do bot`,
                        `</analisator erros-tecnicos limpar:${analisatorCommandId}> - limpar os erros técnicos do bot`,
                        '',
                        `</analisator erros-ortograficos adicionar:${analisatorCommandId}> - adicionar um erro ortográfico ao bot`,
                        `</analisator erros-ortograficos remover:${analisatorCommandId}> - remover um erro ortográfico do bot`,
                        `</analisator erros-ortograficos listar:${analisatorCommandId}> - listar os erros ortográficos do bot`,
                        `</analisator erros-ortograficos limpar:${analisatorCommandId}> - limpar os erros ortográficos do bot`,
                    )
                },
                {
                    name: "Administrador",
                    value: brBuilder(
                        `</analisator gerenciar-analisadores adicionar:${analisatorCommandId}> - adicionar um analisador`,
                        `</analisator gerenciar-analisadores remover:${analisatorCommandId}> - remover um analisador`,
                    ),
                }
            ],
            color: settings.colors.success,
            footer: {
                text: `Comando solicitado por: ${interaction.user.displayName}`,
                iconURL: interaction.user.displayAvatarURL()
            },
            timestamp: new Date().toISOString()
        });

        interaction.editReply({ embeds: [embed] });
    }
});
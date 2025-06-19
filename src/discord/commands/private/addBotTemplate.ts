import { createCommand } from "#base";
import { res } from "#functions";
import { settings } from "#settings";
import { createEmbed, createRow } from "@magicyan/discord";
import { ApplicationCommandType, ButtonBuilder, ButtonStyle, Channel, ChannelType } from "discord.js";

createCommand({
    name: "add-bot-template",
    description: "add bot template",
    type: ApplicationCommandType.ChatInput,
    async run(interaction){
        const { user } = interaction;
        if (user.id !== "1314229932309745704" && user.id !== "1171963692984844401") {
            interaction.reply(res.danger("You are not allowed to use this command!"));
            return;
        }

        const embeds = [
            createEmbed({
                title: "Adicionar Aplicação",
                description: "Se sua aplicação segue os requisitos na embed abaixo clique no Botão \"Adicionar Aplicação\".",
                color: "#0A343E"
            }),
            createEmbed({
                description: `
                    # <:addapp:1373032958088188048> Adicionar App - Qualificações

                    - 1. Original:
                    > A aplicação não deve obter nenhum comando com uso de templete, share ou sharecode de outras aplicações ou wikis! 

                    - 2. Nsfw:
                    > Está Proibido Qualquer Comando, imagem ou emojis Nsfw ou que apresentam Gore na aplicação! 

                    - 3. Divulgação:
                    > A Aplicação está proibida de divulgar qualquer servidor ou link sem contato com a aplicação! 

                    - 4. Erros:
                    > A aplicação só deve apresentar 5 Erros em sua análise! Para Erros Ortográficos São contados apenas 7! 

                    - 5. Raid:
                    > A Aplicação não deve ser de raid ou ter participado de uma! Isto conta com o desenvolvedor Também!

                    - 6. Comandos:
                    > A Aplicação deve ter no minimo 10 comandos!

                    # Requisitos Extras:

                    - 1. Tos:
                    > A Aplicação deve seguir todos Os Termos de serviços do Discord!
                `,
                color: "#0A343E"
            })
        ]

        const button = createRow(
            new ButtonBuilder({
                customId: "botlist/addbot/1",
                label: "Adicionar Aplicação",
                style: ButtonStyle.Success
            })
        )

        
        const channel = await interaction.client.channels.fetch(settings.guild.channels.addBot) as Channel;

        if (!channel) {
            interaction.reply(res.danger("Não foi possivel encontrar o canal!"));
            return;
        };
        
        if (channel?.type !== ChannelType.GuildText) return;
        
        try {
            await channel.send({
                embeds,
                components: [button]
            })
            interaction.reply(res.success("template enviado com sucesso!"))
        } catch (error: any) {
            interaction.reply(res.danger("Não foi possivel enviar o template! `" + error.message + "`"));
            return;
        }
    }
});
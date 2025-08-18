import { createCommand } from "#base";
import { res } from "#functions";
import { settings } from "#settings";
import { createEmbed, createRow } from "@magicyan/discord";
import { ApplicationCommandType, ButtonBuilder, ButtonStyle, Channel, ChannelType, channelMention } from "discord.js";

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
                description: `
                    ## Adicione sua aplicação ao servidor! fique atento aos requisitos em: ${channelMention("1389391615537189004")},
                    E ai? sua aplicação atende aos requisitos? clique no botão abaixo para adicionar sua aplicação!
                `,
                color: "#0A343E"
            })
        ]

        const button = createRow(
            new ButtonBuilder({
                label: "Adicionar Aplicação",
                style: ButtonStyle.Link,
                url: "https://erisbot.squareweb.app/botlist/addBot?server=devzone"
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
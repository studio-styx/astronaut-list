import { createCommand } from "#base";
import { res } from "#functions";
import { createEmbed, createRow } from "@magicyan/discord";
import { ApplicationCommandType, ButtonBuilder, ButtonStyle } from "discord.js";

createCommand({
    name: "brut-template",
    description: "enviar o template forçado ao canal",
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
                description: `Abaixo os Requisitos:

                    1. - E Proibido a aplicação ter conteúdo ou comandos que quebrem a tos do Discord,ou da Cosmo Lab

                    2. - A aplicação não deve ter comandos +18 ou furry.

                    3. - A aplicação não deve ser de raid ou a ter participado de uma.

                    4. - Se a aplicação obter mais de "7 Erros" será reprovada.

                    5. - Proibido comandos kibados,seja original!

                    6. - Se a aplicação obter "5 Erros Ortográficos" graves será reprovada.

                    7. - Se a aplicação tiver comandos agressivos ela será reprovada na hora!

                    8. - A aplicação não deve ser plagiada ou ter comandos plagiados ou que contenham conteúdo pirata!

                    9. - Se a aplicação não cumprir estes requisitos ela será removida do servidor! 

                    🌍 - Cosmo Lab`,
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

        interaction.reply({
            embeds,
            components: [button]
        })
    }
});
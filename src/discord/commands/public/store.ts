import { createCommand } from "#base";
import { menus } from "#menus";
import { ApplicationCommandType } from "discord.js";

createCommand({
    name: "loja",
    description: "loja do bot",
    type: ApplicationCommandType.ChatInput,
    async run(interaction){
        await interaction.reply(menus.store(interaction.user.id))
    }
});
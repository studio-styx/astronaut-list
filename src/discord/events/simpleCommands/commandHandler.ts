import { createEvent } from "#base";
import { settings } from "#settings";
import { ChannelType } from "discord.js";
import { vote } from "./commands/vote.js";

createEvent({
    name: "prefixCommandHandler",
    event: "messageCreate",
    async run(message) {
        if (message.author.bot) return;
        if (message.channel.type === ChannelType.DM) return;
        if (!message.content.startsWith(settings.prefix)) return;
        const args = message.content.slice(settings.prefix.length).trim().split(/ +/g);
        const commandName = args.shift()?.toLowerCase();

        if (!commandName) return;

        switch(commandName) {
            case "votar":
            case "v":
            case "vote": {
                await vote(message, args);
                return;
            }
            default: {
                message.reply("Comando não encontrado!, o único comando por prefixo existente é o **vote**, use **/help** para ver os comandos em slash");
                return;
            }
        }
    },
});
import { Store, setupCreators } from "#base";
import { res } from "#functions";
import { settings } from "#settings";
import fs from "fs";

const onlyAdmin = process.env.ONLYADMIN === "yes" ? true : false;

const store = new Store<Date>();

export const { createCommand, createEvent, createResponder } = setupCreators({
    commands: {
        guilds: ["1322716137972039814", "1338980027529957396", "1373806908149858334"],
        onError(error, interaction) {
            console.log(error);

            if (interaction.deferred) {
                interaction.editReply(res.danger("Ocorreu um erro ao executar o comando"));
            } else { 
                interaction.reply(res.danger("Ocorreu um erro ao executar o comando"));
            }
            return;
        },
        async middleware(interaction, block) {
            const { user } = interaction;
            if (onlyAdmin) {
                if (!settings.admins.includes(user.id)) {
                    interaction.reply(res.danger("O bot está em manutenção! tente novamente mais tarde!"));
                    block();
                    return;
                }
            }

            const rootPath = process.cwd();

            const blackListedUsers: string[] = JSON.parse(fs.readFileSync(`${rootPath}/blacklist.json`, "utf-8"));

            if (blackListedUsers.includes(user.id)) {
                interaction.reply(res.danger("Você está na blacklist!"));
                block();
                return;
            }

            const storedDate = store.get(interaction.user.id);
            if (store.has(interaction.user.id)) {
                interaction.reply(res.danger(`Acalme-se, você está sendo muito rápido! volte novamente em <t:${Math.floor(Number(storedDate) / 1000)}:R>`));
                block();
                return;
            }

            store.set(interaction.user.id, new Date(Date.now() + 6000), { time: 6000 });
        },
    },
    responders: {
        onError(error, interaction) {
            console.log(error);
            if (interaction.deferred) {
                interaction.editReply(res.danger(`Ocorreu um erro ao executar a interação! ${error instanceof Error? error.message : 'Unknown error'}`));
                return;
            }
            interaction.reply(res.danger(`Ocorreu um erro ao executar a interação! ${error instanceof Error ? error.message : 'Unknown error'}`));
            return;
        },
        async middleware(interaction, block) {
            const { user } = interaction;
            
            if (onlyAdmin) {
                if (!settings.admins.includes(user.id)) {
                    interaction.reply(res.danger("O bot está em manutenção! tente novamente mais tarde!"));
                    block();
                    return;
                }
            }

            const rootPath = process.cwd();

            const blackListedUsers: string[] = JSON.parse(fs.readFileSync(`${rootPath}/blacklist.json`, "utf-8"));

            if (blackListedUsers.includes(user.id)) {
                interaction.reply(res.danger("Você está na blacklist!"));
                block();
                return;
            }

            const storedDate = store.get(interaction.user.id);
            if (store.has(interaction.user.id)) {
                interaction.reply(res.danger(`Acalme-se, você está sendo muito rápido! volte novamente em <t:${Math.floor(Number(storedDate) / 1000)}:R>`));
                block();
                return;
            }

            store.set(interaction.user.id, new Date(Date.now() + 2000), { time: 2000 });
        },
    }
});
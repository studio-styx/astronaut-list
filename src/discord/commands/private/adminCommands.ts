import { createCommand } from "#base";
import { res } from "#functions";
import { settings } from "#settings";
import { ApplicationCommandOptionType, ApplicationCommandType } from "discord.js";
import fs from "fs";

createCommand({
    name: "admin",
    description: "comandos de admin",
    type: ApplicationCommandType.ChatInput,
    options: [
        {
            name: "blacklist",
            description: "comandos de blacklist",
            type: ApplicationCommandOptionType.SubcommandGroup,
            options: [
                {
                    name: "add",
                    description: "adiciona um usuário a blacklist",
                    type: ApplicationCommandOptionType.Subcommand,
                    options: [
                        {
                            name: "user",
                            description: "usuário a ser adicionado",
                            type: ApplicationCommandOptionType.User,
                            required: true
                        }
                    ]
                },
                {
                    name: "remove",
                    description: "remove um usuário da blacklist",
                    type: ApplicationCommandOptionType.Subcommand,
                    options: [
                        {
                            name: "user",
                            description: "usuário a ser removido",
                            type: ApplicationCommandOptionType.String,
                            required: true,
                            autocomplete: true
                        }
                    ]
                },
                {
                    name: "list",
                    description: "lista todos os usuários da blacklist",
                    type: ApplicationCommandOptionType.Subcommand
                }
            ]
        }
    ],
    async autocomplete(interaction) {
        const focusedValue = interaction.options.getFocused().toLowerCase();
    
        const rootPath = process.cwd();
        const blackListedusers: string[] = JSON.parse(
            fs.readFileSync(`${rootPath}/blacklist.json`, "utf-8")
        );
    
        const getUserName = async (id: string) => {
            const cachedUser = interaction.client.users.cache.get(id);
            if (cachedUser) {
                return cachedUser.displayName ?? cachedUser.username ?? "Não encontrado";
            }
            
            try {
                const fetchedUser = await interaction.client.users.fetch(id);
                return fetchedUser.displayName ?? fetchedUser.username ?? "Não encontrado";
            } catch (error) {
                return "Não encontrado";
            }
        };
    
        const users = await Promise.all(
            blackListedusers.map(async (id) => {
                const name = await getUserName(id);
                return { name, value: id };
            })
        );
    
        const filteredUsers = users.filter(user =>
            user.name.toLowerCase().includes(focusedValue)
        );
    
        await interaction.respond(
            filteredUsers.slice(0, 25)
        );
    },
    async run(interaction){
        const { options, user } = interaction;

        if (!settings.admins.includes(user.id)) {
            interaction.reply(res.danger("Você não tem permissão para usar este comando!"));
            return;
        }

        const subcommand = options.getSubcommand(true);
        const subcommandGroup = options.getSubcommandGroup(true);

        switch (subcommandGroup) {
            case "blacklist":
                switch (subcommand) {
                    case "add": {
                        const user = options.getUser("user", true);
                        const rootPath = process.cwd();
                        const blackListedUsers: string[] = JSON.parse(fs.readFileSync(`${rootPath}/blacklist.json`, "utf-8"));
                        if (blackListedUsers.includes(user.id)) {
                            interaction.reply(res.danger("Usuário já está na blacklist!"));
                            return;
                        }
                        blackListedUsers.push(user.id);
                        fs.writeFileSync(`${rootPath}/blacklist.json`, JSON.stringify(blackListedUsers));
                        interaction.reply(res.warning("Usuário adicionado na blacklist!"));
                        return;
                    }
                    case "remove": {
                        const userId = options.getString("user", true);
                        const rootPath = process.cwd();
                        const blackListedUsers: string[] = JSON.parse(fs.readFileSync(`${rootPath}/blacklist.json`, "utf-8"));
                        if (!blackListedUsers.includes(userId)) {
                            interaction.reply(res.danger("O Usuário não está na blacklist!"));
                            return;
                        }
                        blackListedUsers.splice(blackListedUsers.indexOf(userId), 1);
                        fs.writeFileSync(`${rootPath}/blacklist.json`, JSON.stringify(blackListedUsers));
                        interaction.reply(res.success("Usuário removido da blacklist!"));
                        return;
                    }
                }
        }
    }
});
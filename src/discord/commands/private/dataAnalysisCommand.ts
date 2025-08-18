import { createCommand } from "#base";
import { prisma } from "#database";
import { icon, Month, res } from "#functions";
import { menus } from "#menus";
import { ApplicationCommandOptionType, ApplicationCommandType } from "discord.js";

const monthChoices = [
    {
        name: "Janeiro",
        value: "january"
    },
    {
        name: "Fevereiro",
        value: "february"
    },
    {
        name: "Março",
        value: "march"
    },
    {
        name: "Abril",
        value: "april"
    },
    {
        name: "Maio",
        value: "may"
    },
    {
        name: "Junho",
        value: "june"
    },
    {
        name: "Julho",
        value: "july"
    },
    {
        name: "Agosto",
        value: "august"
    },
    {
        name: "Setembro",
        value: "september"
    },
    {
        name: "Outubro",
        value: "october"
    },
    {
        name: "Novembro",
        value: "november"
    },
    {
        name: "Dezembro",
        value: "december"
    }
]

createCommand({
    name: "data-analysis",
    description: "analisar dados",
    type: ApplicationCommandType.ChatInput,
    options: [
        {
            name: "ranking",
            description: "ranking de dados",
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: "month",
                    description: "mês das analises",
                    type: ApplicationCommandOptionType.String,
                    required: false,
                    choices: monthChoices
                }
            ]
        },
        {
            name: "user",
            description: "analise de dados de um usuário",
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: "user",
                    description: "usuário",
                    type: ApplicationCommandOptionType.User,
                    required: true
                },
                {
                    name: "month",
                    description: "mês das analises",
                    type: ApplicationCommandOptionType.String,
                    required: false,
                    choices: monthChoices
                }
            ]
        },
        {
            name: "top-user",
            description: "pegar o melhor usuário",
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: "month",
                    description: "mês das analises",
                    type: ApplicationCommandOptionType.String,
                    required: false,
                    choices: monthChoices
                }
            ]
        },
        {
            name: "less-user",
            description: "pegar o pior usuário",
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: "month",
                    description: "mês das analises",
                    type: ApplicationCommandOptionType.String,
                    required: false,
                    choices: monthChoices
                }
            ]
        }
    ],
    async run(interaction) {
        await interaction.deferReply();

        const author = await prisma.user.findUnique({
            where: {
                id: interaction.user.id
            }
        })

        if (!author?.isAvaliator) {
            interaction.editReply(res.danger(`${icon.denied} | Você não é analisador.`));
            return;
        }

        const month = interaction.options.getString("month") as Month | null;

        switch (interaction.options.getSubcommand()) {
            case "user": {
                const user = interaction.options.getUser("user", true);
        
                const userExists = await prisma.user.findUnique({
                    where: {
                        id: user.id,
                        isAvaliator: true
                    }
                })
        
                if (!userExists) {
                    interaction.editReply(res.danger(`${icon.denied} | O usuário ${user.username} não é analisador.`));
                    return;
                }
        
                const analyses = await prisma.analyze.findMany();
        
                interaction.editReply(menus.dataAnalyse.user(analyses, user.id, month || undefined));
                return;
            }
            case "ranking": {
                const analyses = await prisma.analyze.findMany();

                interaction.editReply(menus.dataAnalyse.ranking(analyses, month || undefined));
                return;
            }
        }

    }
});
import { createCommand } from "#base";
import { prisma } from "#database";
import { ApplicationCommandOptionType, ApplicationCommandType } from "discord.js";
import addAnalisator from "./manage-analisator/addanalisator.js";
import removeAnalisator from "./manage-analisator/removeAnalisator.js";
import listAnalisators from "./manage-analisator/listAnalisators.js";
import startAnalise from "./avaliation/startAnalise.js";
import endAnalise from "./avaliation/endAnalise.js";
import cancelAnalise from "./avaliation/cancelAnalise.js";
import addBotError from "./boterrors/addBotError.js";
import removeBotError from "./boterrors/removeBotError.js";
import listBotErrors from "./boterrors/listBotErrors.js";
import clearBotErrors from "./boterrors/clearBotErrors.js";
import { searchBotsWithCache } from "#functions";

createCommand({
    name: "analisator",
    description: "comandos de analisadores",
    type: ApplicationCommandType.ChatInput,
    options: [
        // Comandos diretos (sem grupos)
        {
            name: "listar-analisadores",
            description: "Listar todos os analisadores",
            type: ApplicationCommandOptionType.Subcommand
        },

        // Grupo para gerenciar analisadores
        {
            name: "gerenciar-analisadores",
            description: "Comandos para gerenciar analisadores",
            type: ApplicationCommandOptionType.SubcommandGroup,
            options: [
                {
                    name: "adicionar",
                    description: "Adicionar um novo analisador",
                    type: ApplicationCommandOptionType.Subcommand,
                    options: [
                        {
                            name: "user",
                            description: "O usuário a ser adicionado como analisador",
                            type: ApplicationCommandOptionType.User,
                            required: true
                        }
                    ]
                },
                {
                    name: "remover",
                    description: "Remover um analisador",
                    type: ApplicationCommandOptionType.Subcommand,
                    options: [
                        {
                            name: "analisador",
                            description: "O analisador a ser removido",
                            type: ApplicationCommandOptionType.String,
                            required: true,
                            autocomplete: true
                        }
                    ]
                }
            ]
        },
        
        // Grupo para análise de bots
        {
            name: "analise",
            description: "Comandos para análise de bots",
            type: ApplicationCommandOptionType.SubcommandGroup,
            options: [
                {
                    name: "iniciar",
                    description: "Iniciar uma nova análise",
                    type: ApplicationCommandOptionType.Subcommand,
                    options: [
                        {
                            name: "bot",
                            description: "O bot a ser analisado",
                            type: ApplicationCommandOptionType.String,
                            required: true,
                            autocomplete: true
                        }
                    ]
                },
                {
                    name: "finalizar",
                    description: "Finalizar e enviar uma análise",
                    type: ApplicationCommandOptionType.Subcommand,
                    options: [
                        {
                            name: "aprovado",
                            description: "Se o bot foi aprovado ou não",
                            type: ApplicationCommandOptionType.Boolean,
                            required: true
                        },
                        {
                            name: "justificativa",
                            description: "Justificativa para a decisão",
                            type: ApplicationCommandOptionType.String,
                            required: true
                        }
                    ]
                },
                {
                    name: "cancelar",
                    description: "Cancelar uma análise em andamento",
                    type: ApplicationCommandOptionType.Subcommand
                }
            ]
        },
        
        // Grupo para erros técnicos
        {
            name: "erros-tecnicos",
            description: "Gerenciar erros técnicos encontrados",
            type: ApplicationCommandOptionType.SubcommandGroup,
            options: [
                {
                    name: "adicionar",
                    description: "Adicionar um erro técnico",
                    type: ApplicationCommandOptionType.Subcommand,
                    options: [
                        {
                            name: "erro",
                            description: "Descrição do erro encontrado",
                            type: ApplicationCommandOptionType.String,
                            required: true
                        }
                    ]
                },
                {
                    name: "remover",
                    description: "Remover um erro técnico",
                    type: ApplicationCommandOptionType.Subcommand,
                    options: [
                        {
                            name: "erro",
                            description: "Erro técnico a ser removido",
                            type: ApplicationCommandOptionType.String,
                            required: true,
                            autocomplete: true
                        }
                    ]
                },
                {
                    name: "listar",
                    description: "Listar todos os erros técnicos",
                    type: ApplicationCommandOptionType.Subcommand
                },
                {
                    name: "limpar",
                    description: "Limpar todos os erros técnicos",
                    type: ApplicationCommandOptionType.Subcommand
                }
            ]
        },
        
        // Grupo para erros ortográficos
        {
            name: "erros-ortograficos",
            description: "Gerenciar erros ortográficos encontrados",
            type: ApplicationCommandOptionType.SubcommandGroup,
            options: [
                {
                    name: "adicionar",
                    description: "Adicionar um erro ortográfico",
                    type: ApplicationCommandOptionType.Subcommand,
                    options: [
                        {
                            name: "erro",
                            description: "O erro ortográfico encontrado",
                            type: ApplicationCommandOptionType.String,
                            required: true
                        }
                    ]
                },
                {
                    name: "remover",
                    description: "Remover um erro ortográfico",
                    type: ApplicationCommandOptionType.Subcommand,
                    options: [
                        {
                            name: "erro",
                            description: "Erro ortográfico a ser removido",
                            type: ApplicationCommandOptionType.String,
                            required: true,
                            autocomplete: true
                        }
                    ]
                },
                {
                    name: "listar",
                    description: "Listar todos os erros ortográficos",
                    type: ApplicationCommandOptionType.Subcommand
                },
                {
                    name: "limpar",
                    description: "Limpar todos os erros ortográficos",
                    type: ApplicationCommandOptionType.Subcommand
                }
            ]
        }
    ],
    async autocomplete(interaction) {
        const commandGroup = interaction.options.getSubcommandGroup();
        const command = interaction.options.getSubcommand();
        const focusedValue = interaction.options.getFocused();

        switch (commandGroup) {
            case "gerenciar-analisadores":
                switch (command) {
                    case "remover":
                        const choices = await prisma.user.findMany({
                            where: { isAvaliator: true }
                        });

                        const findUsername = async (userId: string) => {
                            return (await interaction.guild?.members.fetch(userId))?.displayName || userId;
                        }

                        const usersWithName = await Promise.all(choices.map(async choice => ({
                            name: await findUsername(choice.id),
                            value: choice.id
                        })));

                        const filteredUsers = usersWithName.filter(user => 
                            user.name.toLowerCase().includes(focusedValue.toLowerCase())
                        );

                        return interaction.respond(
                            filteredUsers.length > 0 
                                ? filteredUsers.slice(0, 25) 
                                : [{ name: "Nenhum analisador encontrado", value: "none" }]
                        );
                }
                break;

            case "analise":
                switch (command) {
                    case "iniciar":
                        const choices = await searchBotsWithCache(focusedValue, { avaliation: false });

                        return interaction.respond(
                            choices.length > 0
                                ? choices.map(choice => ({
                                    name: choice.name,
                                    value: choice.id
                                }))
                                : [{ name: "Nenhum bot disponível para análise", value: "none" }]
                        );
                }
                break;

            case "erros-tecnicos":
                const userTech = await prisma.user.findUnique({
                    where: {
                        id: interaction.user.id,
                        analising: { not: null }
                    }
                });

                if (!userTech?.analising) {
                    return interaction.respond([{ name: "Você não está analisando nenhum bot", value: "none" }]);
                }

                switch (command) {
                    case "remover":
                        const techChoices = await prisma.annotation.findMany({
                            where: {
                                text: { contains: focusedValue, mode: "insensitive" },
                                userId: interaction.user.id,
                                applicationId: userTech.analising,
                                type: "error"
                            }
                        });

                        return interaction.respond(
                            techChoices.length > 0
                                ? techChoices.slice(0, 25).map(choice => {
                                    const fullText = choice.text;
                                    let displayText;
                        
                                    if (fullText.length > 94) {
                                        displayText = fullText.slice(0, 94) + "..." + fullText.slice(-2);
                                    } else {
                                        displayText = fullText;
                                    }
                        
                                    return {
                                        name: displayText,
                                        value: choice.id.toString()
                                    };
                                })
                                : [{ name: "Nenhum erro ortográfico encontrado", value: "none" }]
                        );
                }
                break;

            case "erros-ortograficos":
                const userOrt = await prisma.user.findUnique({
                    where: {
                        id: interaction.user.id,
                        analising: { not: null }
                    }
                });

                if (!userOrt?.analising) {
                    return interaction.respond([{ name: "Você não está analisando nenhum bot", value: "none" }]);
                }

                switch (command) {
                    case "remover":
                        const ortChoices = await prisma.annotation.findMany({
                            where: {
                                text: { contains: focusedValue, mode: "insensitive" },
                                userId: interaction.user.id,
                                applicationId: userOrt.analising,
                                type: "ortographic"
                            }
                        });

                        return interaction.respond(
                            ortChoices.length > 0
                                ? ortChoices.slice(0, 25).map(choice => {
                                    const fullText = choice.text;
                                    let displayText;
                        
                                    if (fullText.length > 94) {
                                        displayText = fullText.slice(0, 94) + "..." + fullText.slice(-2);
                                    } else {
                                        displayText = fullText;
                                    }
                        
                                    return {
                                        name: displayText,
                                        value: choice.id.toString()
                                    };
                                })
                                : [{ name: "Nenhum erro ortográfico encontrado", value: "none" }]
                        );
                        
                }
                break;
        }
    },
    async run(interaction) {
        switch (interaction.options.getSubcommandGroup()) {
            case "gerenciar-analisadores": {
                switch (interaction.options.getSubcommand()) {
                    case "adicionar": 
                        await addAnalisator(interaction); 
                        break;
                    case "remover": 
                        await removeAnalisator(interaction); 
                        break;
                }
                break;
            }
            case "analise": {
                switch (interaction.options.getSubcommand()) {
                    case "iniciar": 
                        await startAnalise(interaction); 
                        break;
                    case "finalizar": 
                        await endAnalise(interaction); 
                        break;
                    case "cancelar": 
                        await cancelAnalise(interaction); 
                        break;
                }
                break;
            }
            case "erros-tecnicos": {
                switch (interaction.options.getSubcommand()) {
                    case "adicionar": 
                        await addBotError(interaction, "error"); 
                        break;
                    case "remover": 
                        await removeBotError(interaction, "error"); 
                        break;
                    case "listar": 
                        await listBotErrors(interaction, "error"); 
                        break;
                    case "limpar": 
                        await clearBotErrors(interaction, "error"); 
                        break;
                }
                break;
            }
            case "erros-ortograficos": {
                switch (interaction.options.getSubcommand()) {
                    case "adicionar": 
                        await addBotError(interaction, "ortographic"); 
                        break;
                    case "remover": 
                        await removeBotError(interaction, "ortographic"); 
                        break;
                    case "listar": 
                        await listBotErrors(interaction, "ortographic"); 
                        break;
                    case "limpar": 
                        await clearBotErrors(interaction, "ortographic"); 
                        break;
                }
                break;
            }
            default:
                await listAnalisators(interaction);
                break;
        }
    }
});
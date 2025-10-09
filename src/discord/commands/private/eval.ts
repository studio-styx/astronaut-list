import { createCommand } from "#base";
import { res } from "#functions";
import { settings } from "#settings";
import { ApplicationCommandOptionType, ApplicationCommandType } from "discord.js";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

createCommand({
    name: "eval",
    description: "Executa código JavaScript e prisma",
    type: ApplicationCommandType.ChatInput,
    options: [
        {
            name: "code",
            description: "Código para executar",
            type: ApplicationCommandOptionType.String,
            required: true
        }
    ],
    async run(interaction) {
        if (!settings.admins.includes(interaction.user.id)) {
            await interaction.reply(res.danger("Você não tem permissão para usar este comando!"));
            return;
        }

        const code = interaction.options.getString("code", true);

        await interaction.deferReply();

        try {
            let result;
            let isPrisma = code.includes("prisma.");
            let isCtx = code.includes("ctx.");

            if (isPrisma && !code.includes("await")) {
                await interaction.editReply(res.danger("Operações Prisma devem usar 'await'. Exemplo: \`'await prisma.user.findUnique(...)'\`"));
                return;
            }

            if (isPrisma) {
                // Validação para operações Prisma
                const prismaOperations = [
                    "findUnique", "findMany", "create", "update",
                    "delete", "upsert", "findFirst", "count", "deleteMany", "updateMany"
                ];
                const hasValidOperation = prismaOperations.some(op => code.includes(`.${op}(`));
                if (!hasValidOperation) {
                    await interaction.editReply(res.danger("Operação Prisma inválida ou não suportada detectada."));
                    return;
                }

                // Executa código Prisma
                result = await eval(`(async () => { return ${code} })()`);
            } else if (isCtx) {
                // Executa código com ctx no estilo aoi.js
                result = await eval(`(async () => { return ${code} })()`);
            } else {
                // Executa JavaScript puro
                result = eval(code);
            }

            // Formata e envia o resultado
            const formattedResult = JSON.stringify(result, null, 2);
            await interaction.editReply(res.success(`Resultado: \`\`\`json\n${formattedResult.slice(0, 3000)}\`\`\``, { flags: [] }));

            // Envia o restante do resultado, se necessário
            if (formattedResult.length > 3000) {
                let remaining = formattedResult.slice(3000);
                while (remaining.length > 0) {
                    const chunk = remaining.slice(0, 3900);
                    await interaction.followUp(res.success(`\`\`\`json\n${chunk}\`\`\``, { flags: [] }));
                    remaining = remaining.slice(3900);
                }
            }
        } catch (error: any) {
            await interaction.editReply(res.danger(`Ocorreu um erro: ${error.message}`));
        } finally {
            if (code.includes("prisma.")) {
                await prisma.$disconnect();
            }
        }
    }
});
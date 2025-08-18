import { DataAnalyse, Month } from "#functions";
import { settings } from "#settings";
import { brBuilder, createEmbed, createRow } from "@magicyan/discord";
import { Analyze } from "@prisma/client";
import { SelectMenuComponentOptionData, StringSelectMenuBuilder, userMention, type InteractionReplyOptions } from "discord.js";

export function rankingMenu<R>(analyzes: Analyze[], month: Month | undefined, page: number = 0): R {
    const embed = createEmbed({
        color: settings.colors.success
    })
    const title = brBuilder(
        "## Análise de dados",
        "-# Ranking, escolha o tipo de ranking",
        `-# Periodo: ${month ? month : "Todos os meses"}`,
    )


    const rankingRow = createRow(
        new StringSelectMenuBuilder({
            customId: `data/ranking/${month}`,
            placeholder: "Selecione o tipo de ranking",
            options: [
                { label: "Analises", value: "1", default: page === 1 },
                { label: "Taxa de aprovação", value: "2", default: page === 2 },
                { label: "Tempo de análise", value: "3", default: page === 3 },
                { label: "Média de tempo de analise", value: "4", default: page === 4 },
                { label: "Média de caracteres por análise", value: "5", default: page === 5 },
                { label: "Total de caracteres escritos", value: "6", default: page === 6 },
            ].filter(Boolean) as SelectMenuComponentOptionData[]
        })
    );

    const dataAnalyse = new DataAnalyse(analyzes, month);
    dataAnalyse.startAnalyse();

    switch (page) {
        case 0: {
            embed.setDescription(title + "\n\nEscolha um tipo de ranking para ver os dados.")
            break;
        }
        case 1: {
            const analyses = dataAnalyse.getAnaliseRanking();

            // Converter o Record para um array de entradas [userId, count] e ordenar
            const sortedUsers = Object.entries(analyses)
                .sort((a, b) => b[1] - a[1]) // Ordena do maior para o menor
                .slice(0, 15); // Pega os top 15

            const rankingText = sortedUsers.map(([userId, count], index) =>
                `${index + 1}. **${userMention(userId)}**: **\`${count}\`** ${count === 1 ? "análise" : "análises"}**`
            ).join("\n");

            embed.setDescription(title + "\n\n" + rankingText);
            break;
        }
    }

    return ({
        flags: ["Ephemeral"],
        embeds: [embed],
        components: [rankingRow]
    } satisfies InteractionReplyOptions) as R;
}
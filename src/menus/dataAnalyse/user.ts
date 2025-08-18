import { DataAnalyse, Month } from "#functions";
import { settings } from "#settings";
import { brBuilder, createContainer, createSeparator } from "@magicyan/discord";
import { Analyze } from "@prisma/client";
import { userMention, type InteractionReplyOptions } from "discord.js";

export function userMenu<R>(analyzes: Analyze[], userId: string, month: Month | undefined): R {
    const dataAnalyse = new DataAnalyse(analyzes, month);
    dataAnalyse.startAnalyse();

    const userAnalyses = dataAnalyse.getUserAnalyzes(userId);
    const timeStats = dataAnalyse.calculateTimeStats().find(s => s.userId === userId);
    const comentarys = dataAnalyse.getUserComentarys(userId);
    const approvalPercentage = dataAnalyse.getUserAverageApprovedPercentage(userId);

    const components: any[] = [
        brBuilder(
            "# Análise de dados",
            `-# Usuário: ${userMention(userId)}`,
            `-# Período: ${month ? month : "Todos os meses"}`
        ),
        createSeparator(),
        brBuilder(
            `> **Total de análises:** \`${userAnalyses.length}\``,
            `> **Média de tempo por análise:** \`${dataAnalyse.formatSeconds(timeStats?.averageSeconds || 0)}\``,
            `> **Tempo total em análises:** \`${dataAnalyse.formatSeconds(timeStats?.totalSeconds || 0)}\``,
            `> **Taxa de aprovação:** \`${dataAnalyse.formatPercentage(approvalPercentage)}\``,
            `> **Média de caracteres por análise:** \`${dataAnalyse.getUserAverageWriteLength(userId).toFixed(2)}\``,
            `> **Total de caracteres escritos:** \`${dataAnalyse.countUserCharacters(userId)}\``
        ),
        createSeparator(),
        "# Comentários",
        comentarys?.comentarys.map(comment => `> ${comment}`).join("\n") || "Nenhum comentário encontrado."
    ];

    const container = createContainer(
        settings.colors.success,
        components
    );

    return ({
        flags: ["Ephemeral", "IsComponentsV2"],
        components: [container]
    } satisfies InteractionReplyOptions) as R;
}
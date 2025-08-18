import { Analyze } from "@prisma/client/wasm";

export type Month = 'january' | 'february' | 'march' | 'april' | 'may' | 'june' |
    'july' | 'august' | 'september' | 'october' | 'november' | 'december';

export class DataAnalyse {
    private analyses: Analyze[];
    private month: Month | undefined;
    private userAnalysesCache: Record<string, Analyze[]> | null = null;

    constructor(analyses: Analyze[], month?: Month) {
        this.analyses = analyses;
        this.month = month;
    }

    public startAnalyse(): void {
        if (this.month) {
            this.analyses = this.getAnalysisByMonth(this.month);
            // Invalida cache após modificar as análises
            this.userAnalysesCache = null;
        }
    }

    public getAnalyses(): Analyze[] {
        return this.analyses;
    }

    private getAnalysisByMonth(month: Month): Analyze[] {
        const monthMap: Record<Month, number> = {
            january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
            july: 6, august: 7, september: 8, october: 9, november: 10, december: 11
        };

        const targetMonth = monthMap[month];
        const currentYear = new Date().getFullYear();

        return this.analyses.filter(analysis => {
            const createdAt = new Date(analysis.createdAt);
            return (
                createdAt.getMonth() === targetMonth &&
                createdAt.getFullYear() === currentYear
            );
        });
    }

    private separateUsers(): Record<string, Analyze[]> {
        if (this.userAnalysesCache) return this.userAnalysesCache;

        const userAnalysesMap: Record<string, Analyze[]> = {};

        for (const analysis of this.analyses) {
            const userId = analysis.userId;
            if (!userId) continue;

            if (!userAnalysesMap[userId]) {
                userAnalysesMap[userId] = [];
            }
            userAnalysesMap[userId].push(analysis);
        }

        this.userAnalysesCache = userAnalysesMap;
        return userAnalysesMap;
    }

    public getUserAnalyzes(userId: string): Analyze[] {
        const userAnalyses = this.separateUsers();
        return userAnalyses[userId] || [];
    }

    private createRanking<T>(
        mapper: (userId: string) => T,
        sorter: (a: T, b: T) => number
    ): Record<string, T> {
        const usersAnalyses = this.separateUsers();
        const ranking: Record<string, T> = {};
        const entries: [string, T][] = [];

        for (const userId of Object.keys(usersAnalyses)) {
            const value = mapper(userId);
            ranking[userId] = value;
            entries.push([userId, value]);
        }

        entries.sort((a, b) => sorter(a[1], b[1]));

        const sortedRanking: Record<string, T> = {};
        for (const [userId, value] of entries) {
            sortedRanking[userId] = value;
        }

        return sortedRanking;
    }

    public getAnaliseRanking(): Record<string, number> {
        return this.createRanking(
            userId => this.separateUsers()[userId].length,
            (a, b) => b - a
        );
    }

    public countUserCharacters(userId: string): number {
        const userAnalyses = this.separateUsers()[userId] || [];
        return userAnalyses.reduce((sum, analysis) =>
            analysis.avaliation ? sum + analysis.avaliation.length : sum, 0);
    }

    public getUsersByCharacterCount(order: 'asc' | 'desc' = 'desc'): { userId: string, count: number }[] {
        const ranking = this.createRanking(
            userId => this.countUserCharacters(userId),
            (a, b) => order === 'desc' ? b - a : a - b
        );

        return Object.entries(ranking).map(([userId, count]) => ({ userId, count }));
    }

    public getUserMoreWrite(): { userId: string, count: number } | null {
        const ranking = this.getUsersByCharacterCount('desc');
        return ranking[0] || null;
    }

    public getUserLessWrite(): { userId: string, count: number } | null {
        const ranking = this.getUsersByCharacterCount('asc');
        return ranking[0] || null;
    }

    public getUserAverageWriteLength(userId: string): number {
        const userAnalyses = this.separateUsers()[userId] || [];
        if (userAnalyses.length === 0) return 0;
        return this.countUserCharacters(userId) / userAnalyses.length;
    }

    public getUsersByAverageWriteLength(order: 'asc' | 'desc' = 'desc'): { userId: string, average: number }[] {
        const ranking = this.createRanking(
            userId => this.getUserAverageWriteLength(userId),
            (a, b) => order === 'desc' ? b - a : a - b
        );

        return Object.entries(ranking).map(([userId, average]) => ({ userId, average }));
    }

    public getUserWithMoreWriteMedia(): { userId: string, average: number } | null {
        const ranking = this.getUsersByAverageWriteLength('desc');
        return ranking[0] || null;
    }

    public getUserWithLessWriteMedia(): { userId: string, average: number } | null {
        const ranking = this.getUsersByAverageWriteLength('asc');
        return ranking[0] || null;
    }

    private calculateApprovalStats() {
        const userAnalyses = this.separateUsers();
        return Object.keys(userAnalyses).map(userId => {
            const analyses = userAnalyses[userId];
            const total = analyses.length;
            const approved = analyses.filter(a => a.approved).length;

            return {
                userId,
                total,
                approved,
                rejected: total - approved,
                percentage: total > 0 ? (approved / total) * 100 : 0
            };
        });
    }

    public getUsersByAverageApprovedPercentage(order: 'asc' | 'desc' = 'desc'): { userId: string, average: number }[] {
        const stats = this.calculateApprovalStats();
        return stats
            .map(({ userId, percentage }) => ({ userId, average: percentage }))
            .sort((a, b) => order === 'desc' ? b.average - a.average : a.average - b.average);
    }

    public getUserAverageApprovedPercentage(userId: string): number {
        return this.getUsersByAverageApprovedPercentage().find(user => user.userId === userId)?.average || 0;
    }

    public getUserWithMoreApprovedPercentage(): { userId: string, average: number } | null {
        const stats = this.calculateApprovalStats();
        if (stats.length === 0) return null;

        const topUser = stats.reduce((prev, current) =>
            (prev.percentage > current.percentage) ? prev : current
        );
        return {
            userId: topUser.userId,
            average: topUser.percentage
        };
    }

    public getUserWithLessApprovedPercentage(): { userId: string, average: number } | null {
        const stats = this.calculateApprovalStats();
        if (stats.length === 0) return null;

        const bottomUser = stats.reduce((prev, current) =>
            (prev.percentage < current.percentage) ? prev : current
        );
        return {
            userId: bottomUser.userId,
            average: bottomUser.percentage
        };
    }

    public getAnalysisDuration(analysis: Analyze): number {
        if (!analysis.finishedIn || !analysis.createdAt) return 0;
        
        const start = new Date(analysis.createdAt).getTime();
        const end = new Date(analysis.finishedIn).getTime();
        
        // Verifica se a data de término é maior que a de início
        return end > start ? (end - start) / 1000 : 0;
    }

    public formatSeconds(seconds: number): string {
        if (seconds < 60) return `${seconds.toFixed(2)}s`;
        
        const minutes = seconds / 60;
        if (minutes < 60) return `${minutes.toFixed(2)}min`;
        
        const hours = minutes / 60;
        return `${hours.toFixed(2)}h`;
    }

    public formatPercentage(value: number): string {
        return `${Math.max(0, value).toFixed(2)}%`;
    }

    public calculateTimeStats() {
        const userAnalyses = this.separateUsers();
        return Object.keys(userAnalyses).map(userId => {
            const analyses = userAnalyses[userId];
            const validAnalyses = analyses.filter(a => a.finishedIn && a.createdAt);
            const totalSeconds = validAnalyses.reduce((sum, analysis) => {
                const duration = (new Date(analysis.finishedIn!).getTime() - new Date(analysis.createdAt).getTime()) / 1000;
                return sum + duration;
            }, 0);

            return {
                userId,
                totalAnalyses: analyses.length,
                validAnalyses: validAnalyses.length,
                totalSeconds,
                averageSeconds: validAnalyses.length > 0 ? totalSeconds / validAnalyses.length : 0
            };
        });
    }

    public getUserTotalAnalyseTime(userId: string): number {
        const stats = this.calculateTimeStats().find(s => s.userId === userId);
        return stats?.totalSeconds || 0;
    }

    public getUserAverageAnalyseTime(userId: string): number {
        const stats = this.calculateTimeStats().find(s => s.userId === userId);
        return stats?.averageSeconds || 0;
    }

    public getUsersByTotalAnalyseTime(order: 'asc' | 'desc' = 'desc'): { userId: string, total: number }[] {
        return this.calculateTimeStats()
            .map(({ userId, totalSeconds }) => ({ userId, total: totalSeconds }))
            .sort((a, b) => order === 'desc' ? b.total - a.total : a.total - b.total);
    }

    public getUsersByAverageAnalyseTime(order: 'asc' | 'desc' = 'desc'): { userId: string, average: number }[] {
        return this.calculateTimeStats()
            .map(({ userId, averageSeconds }) => ({ userId, average: averageSeconds }))
            .sort((a, b) => order === 'desc' ? b.average - a.average : a.average - b.average);
    }

    public getUserWithMoreAnalyseTime(): { userId: string, total: number } | null {
        const ranking = this.getUsersByTotalAnalyseTime('desc');
        return ranking[0] || null;
    }

    public getUserWithLessAnalyseTime(): { userId: string, total: number } | null {
        const ranking = this.getUsersByTotalAnalyseTime('asc');
        return ranking[0] || null;
    }

    public getUserWithMoreAverageAnalyseTime(): { userId: string, average: number } | null {
        const ranking = this.getUsersByAverageAnalyseTime('desc');
        return ranking[0] || null;
    }

    public getUserWithLessAverageAnalyseTime(): { userId: string, average: number } | null {
        const ranking = this.getUsersByAverageAnalyseTime('asc');
        return ranking[0] || null;
    }

    public getUserStatistics(userId: string): {
        totalAnalyses: number,
        characterCount: number,
        avgCharacters: number,
        approvalPercentage: number,
        totalAnalyseTime: number,
        avgAnalyseTime: number
    } | null {
        const userAnalyses = this.separateUsers()[userId];
        if (!userAnalyses || userAnalyses.length === 0) return null;

        const timeStats = this.calculateTimeStats().find(s => s.userId === userId);
        
        return {
            totalAnalyses: userAnalyses.length,
            characterCount: this.countUserCharacters(userId),
            avgCharacters: this.getUserAverageWriteLength(userId),
            approvalPercentage: this.calculateApprovalStats()
                .find(s => s.userId === userId)?.percentage || 0,
            totalAnalyseTime: timeStats?.totalSeconds || 0,
            avgAnalyseTime: timeStats?.averageSeconds || 0
        };
    }

    public getUserComentarys(userId: string): { userId: string, average: number, comentarys: string[] } | null {
        const stats = this.getUserStatistics(userId);
        if (!stats) return null;

        const analyses = this.separateUsers()[userId].filter(a => a.avaliation);

        // Listas de palavras melhoradas
        const positiveWords = [
            "bom", "ótimo", "excelente", "incrível", "maravilhoso", "perfeito",
            "fantástico", "gostei", "recomendo", "funciona", "correto", "certo",
            "organizado", "incrível", "adoro", "amo", "top", "show", "eficiente",
            "rápido", "facil", "simples", "intuitivo", "completo", "útil", "prático",
            "incrivel", "bacana", "nota 10", "elogio", "parabéns", "feliz", "ótimo trabalho",
            "surpreendente", "impressionante", "lindo", "bonito", "estável", "confiável"
        ];

        const negativeWords = [
            "ruim", "péssimo", "horrível", "terrível", "erro", "bug", "falha",
            "problema", "lento", "travando", "crasha", "bugado", "incompleto",
            "faltando", "inútil", "complexo", "difícil", "chato", "desisti",
            "decepcionante", "frustrante", "pobre", "limitado", "quebrado",
            "inconsistente", "instável", "confuso", "mal", "pior", "fracasso",
            "inaceitável", "inutilizável", "desorganizado", "falta", "ausente"
        ];

        const wordStats = analyses.reduce((acc, analysis) => {
            const words = analysis.avaliation!.toLowerCase()
                .split(/\s+/)
                .map(word => word.replace(/[.,!?]/g, ''))
                .filter(word => word.length >= 3);

            words.forEach(word => {
                if (positiveWords.includes(word)) acc.positive++;
                if (negativeWords.includes(word)) acc.negative++;

                acc.wordCounts[word] = (acc.wordCounts[word] || 0) + 1;
            });

            return acc;
        }, { positive: 0, negative: 0, wordCounts: {} as Record<string, number> });

        const totalWords = wordStats.positive + wordStats.negative;
        const sentimentAverage = totalWords > 0
            ? (wordStats.positive * 2 + wordStats.negative) / totalWords
            : 0.5;

        const comentarys: string[] = [];

        if (wordStats.positive > 0 || wordStats.negative > 0) {
            if (wordStats.positive > wordStats.negative * 2) {
                comentarys.push(this.getRandomComment([
                    `Extremamente positivo (${wordStats.positive} elogios vs ${wordStats.negative} críticas)`,
                    `Linguagem muito positiva (${wordStats.positive} termos positivos identificados)`,
                    `Costuma destacar qualidades (${wordStats.positive} termos positivos)`
                ]));
            } else if (wordStats.positive > wordStats.negative) {
                comentarys.push(`Balanço positivo (${wordStats.positive} termos bons vs ${wordStats.negative} ruins)`);
            } else if (wordStats.negative > wordStats.positive * 2) {
                comentarys.push(this.getRandomComment([
                    `Muito crítico (${wordStats.negative} problemas apontados)`,
                    `Foco em aspectos negativos (${wordStats.negative} termos críticos)`,
                    `Linguagem predominantemente negativa (${wordStats.negative} críticas)`
                ]));
            } else {
                comentarys.push(`Equilíbrio de feedback (${wordStats.positive} positivos vs ${wordStats.negative} negativos)`);
            }
        }

        const mostCommonWord = Object.entries(wordStats.wordCounts)
            .filter(([word]) => word.length >= 3)
            .sort((a, b) => b[1] - a[1])[0];

        if (mostCommonWord && mostCommonWord[1] > 1) {
            const [word, count] = mostCommonWord;
            comentarys.push(`Termo mais usado: "${word}" (${count} vezes)`);

            // Adiciona comentário específico para palavras-chave
            if (negativeWords.includes(word)) {
                comentarys.push(`Atenção: "${word}" é seu termo negativo mais frequente`);
            } else if (positiveWords.includes(word)) {
                comentarys.push(`Destaque: "${word}" é seu elogio mais comum`);
            }
        }

        if (stats.approvalPercentage > 0.8) {
            comentarys.push(this.getRandomComment([
                "Aprova a maioria dos casos analisados",
                "Tende a ser permissivo em suas avaliações",
                "Raramente reprova as submissões"
            ]));
        } else if (stats.approvalPercentage < 0.2) {
            comentarys.push(this.getRandomComment([
                "Reprova a maioria dos casos analisados",
                "Seus critérios de aprovação são rigorosos",
                "Tende a ser exigente nas avaliações"
            ]));
        } else {
            comentarys.push("Aprovações e reprovações equilibradas");
        }

        const avgTimeMinutes = Math.round(stats.avgAnalyseTime / 60);
        const maxTimeMinutes = Math.round(stats.totalAnalyseTime / 60);

        if (avgTimeMinutes < 1) {
            comentarys.push(this.getRandomComment([
                "Analisa em segundos - normalmente quando o bot está offline",
                "Finaliza quase instantaneamente (bots que falham requisitos básicos)",
                "Tempo recorde: avalia em menos de 1 minuto (análises superficiais)"
            ]));
        }
        else if (avgTimeMinutes < 3) {
            comentarys.push(this.getRandomComment([
                "Rápido nas avaliações - conclui em até 3 minutos",
                "Eficiente: avalia bots simples em poucos minutos",
                "Tempo médio curto (1-3min) - foco em requisitos básicos"
            ]));
        }
        else if (avgTimeMinutes < 10) {
            comentarys.push(this.getRandomComment([
                `Tempo médio: ${avgTimeMinutes}min - análise padrão`,
                `Leva em média ${avgTimeMinutes} minutos para avaliação completa`,
                `Analisa cuidadosamente (${avgTimeMinutes}min em média)`
            ]));
        }
        else if (avgTimeMinutes < 30) {
            comentarys.push(this.getRandomComment([
                `Meticuloso: média de ${avgTimeMinutes}min por análise`,
                `Análises detalhadas (${avgTimeMinutes}min em média)`,
                `Tempo acima da média: ${avgTimeMinutes}min por bot`
            ]));
        }
        else {
            comentarys.push(this.getRandomComment([
                `Extremamente detalhista: média de ${avgTimeMinutes}min por análise`,
                `Dedica horas (${avgTimeMinutes}min em média) a cada avaliação`,
                `Análises aprofundadas: tempo médio de ${avgTimeMinutes} minutos`
            ]));
        }

        if (maxTimeMinutes > 180) { // 3 horas
            comentarys.push(this.getRandomComment([
                `Já realizou análises maratonas (máximo: ${Math.floor(maxTimeMinutes / 60)}h${maxTimeMinutes % 60}min)`,
                `Chegou a analisar por ${Math.floor(maxTimeMinutes / 60)}h${maxTimeMinutes % 60}min em casos complexos`,
                `Recorde: análise contínua de ${Math.floor(maxTimeMinutes / 60)}h${maxTimeMinutes % 60}min`
            ]));
        }
        else if (maxTimeMinutes > 60) {
            comentarys.push(`Já dedicou mais de ${Math.floor(maxTimeMinutes / 60)}h a uma única análise`);
        }

        const timeStdDev = this.calculateTimeStdDev(analyses);
        if (timeStdDev > avgTimeMinutes * 0.7) {
            comentarys.push(this.getRandomComment([
                "Tempo de análise bastante variável (depende muito do bot)",
                "Seu tempo de avaliação flutua significativamente",
                "Duração das análises: varia muito caso a caso"
            ]));
        }

        const avgLength = stats.characterCount / stats.totalAnalyses;
        if (avgLength > 200) {
            comentarys.push("Fornece análises detalhadas e extensas");
        } else if (avgLength > 100) {
            comentarys.push("Costuma escrever análises de tamanho médio");
        } else {
            comentarys.push("Suas análises são objetivas e diretas");
        }

        return {
            userId,
            average: sentimentAverage,
            comentarys
        };
    }

    private getRandomComment(comments: string[]): string {
        return comments[Math.floor(Math.random() * comments.length)];
    }
    private calculateTimeStdDev(analyses: Analyze[]): number {
        if (analyses.length < 2) return 0;

        const validAnalyses = analyses.filter(a => a.finishedIn && a.createdAt);
        const durations = validAnalyses.map(a =>
            (new Date(a.finishedIn!).getTime() - new Date(a.createdAt).getTime()) / 1000 / 60
        );

        const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
        const squareDiffs = durations.map(min => Math.pow(min - avg, 2));
        const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / squareDiffs.length;

        return Math.sqrt(avgSquareDiff);
    }

    public getUserOverallScore(userId: string): {
        score: number,
        breakdown: {
            sentiment: number,
            approvalRate: number,
            analysisDepth: number,
            timeEfficiency: number,
            consistency: number
        },
        rating: string
    } | null {
        const stats = this.getUserStatistics(userId);
        if (!stats || stats.totalAnalyses === 0) return null;

        const comentarysResult = this.getUserComentarys(userId);

        // 1. Média de Sentimento (0-1)
        const sentimentScore = comentarysResult && comentarysResult.average !== undefined
            ? (comentarysResult.average - 0.5) * 2 // Normaliza para 0-1
            : 0.5;

        // 2. Taxa de Aprovação (0-1)
        const approvalScore = stats.approvalPercentage / 100;

        // 3. Profundidade de Análise (com base no tamanho médio do texto)
        const depthScore = Math.min(1, stats.avgCharacters / 200); // Considera 200 chars como "ideal"

        // 4. Eficiência de Tempo (0-1)
        const avgTimeMinutes = stats.avgAnalyseTime / 60;
        const timeScore = 1 - Math.min(1, avgTimeMinutes / 30); // 30min = 0, 0min = 1

        // 5. Consistência (desvio padrão do tempo de análise)
        const analyses = this.separateUsers()[userId];
        const timeStdDev = this.calculateTimeStdDev(analyses);
        const consistencyScore = 1 - Math.min(1, timeStdDev / 15); // Quanto menor o desvio, melhor

        // Pesos para cada fator (somatório = 1)
        const weights = {
            sentiment: 0.25,
            approvalRate: 0.25,
            analysisDepth: 0.2,
            timeEfficiency: 0.15,
            consistency: 0.15
        };

        // Cálculo da pontuação geral ponderada
        const overallScore = (
            sentimentScore * weights.sentiment +
            approvalScore * weights.approvalRate +
            depthScore * weights.analysisDepth +
            timeScore * weights.timeEfficiency +
            consistencyScore * weights.consistency
        );

        // Categorização
        const rating = this.getRatingCategory(overallScore);

        return {
            score: this.round(overallScore, 3),
            breakdown: {
                sentiment: this.round(sentimentScore, 3),
                approvalRate: this.round(approvalScore, 3),
                analysisDepth: this.round(depthScore, 3),
                timeEfficiency: this.round(timeScore, 3),
                consistency: this.round(consistencyScore, 3)
            },
            rating
        };
    }

    private getRatingCategory(score: number): string {
        if (score >= 0.9) return "Excelente ★★★★★";
        if (score >= 0.8) return "Muito Bom ★★★★☆";
        if (score >= 0.7) return "Bom ★★★☆☆";
        if (score >= 0.6) return "Regular ★★☆☆☆";
        return "Necessita Melhoria ★☆☆☆☆";
    }

    private round(value: number, decimals: number): number {
        const factor = Math.pow(10, decimals);
        return Math.round(value * factor) / factor;
    }
}
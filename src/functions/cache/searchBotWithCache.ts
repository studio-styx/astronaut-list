import { prisma } from "#database";
import { BotCache } from "#functions";

export async function searchBotsWithCache(
    focused: string, 
    filterOptions: { 
        userId?: string, 
        avaliation?: boolean | null 
    } = { avaliation: true }
) {
    const botCache = BotCache.getInstance();
    
    // Busca todos os bots do cache
    const cachedBots = botCache.getAll();
    console.log("Cached Bots:", cachedBots);
    
    // Filtra os bots do cache baseado nos critérios
    const filteredFromCache = cachedBots.filter(bot => {
        const matchesSearch = 
            bot.name.toLowerCase().includes(focused.toLowerCase()) ||
            (bot.description && bot.description.toLowerCase().includes(focused.toLowerCase())) ||
            bot.id === focused;
        
        const matchesUserId = filterOptions.userId ? bot.userId === filterOptions.userId : true;
        
        let matchesAvaliation = true;
        if (filterOptions.avaliation !== undefined) {
            matchesAvaliation = filterOptions.avaliation
                ? bot.analyze?.finishedIn !== null // Bots avaliados
                : bot.analyze === null || (bot.analyze?.finishedIn === null && bot.analyze?.userId === null); // Bots não avaliados
        }
        
        console.log(`Bot ${bot.id}: matchesSearch=${matchesSearch}, matchesUserId=${matchesUserId}, matchesAvaliation=${matchesAvaliation}`);
        return matchesSearch && matchesUserId && matchesAvaliation;
    }).slice(0, 25);
    
    // Configura a cláusula WHERE para o Prisma
    const whereClause: any = {};
    
    // Filtro por busca
    if (focused) {
        whereClause.OR = [
            { name: { contains: focused, mode: "insensitive" } },
            { description: { contains: focused, mode: "insensitive" } },
            { id: focused }
        ];
    }
    
    // Filtro por avaliação
    if (filterOptions.avaliation !== undefined && filterOptions.avaliation !== null) {
        if (filterOptions.avaliation) {
            whereClause.analyze = { finishedIn: { not: null } }; // Bots avaliados
        } else {
            whereClause.AND = [
                {
                    OR: [
                        { analyze: { is: null } }, // Sem análise associada
                        { analyze: { finishedIn: null, userId: null } } // Análise não concluída e sem analisador
                    ]
                },
                ...(whereClause.OR ? [{ OR: whereClause.OR }] : []) // Combina com filtro de busca, se existir
            ];
            delete whereClause.OR; // Remove OR para evitar conflitos
        }
    }
    
    // Filtro por userId
    if (filterOptions.userId) {
        whereClause.userId = filterOptions.userId;
    }
    
    // Busca no banco de dados
    const dbBots = await prisma.application.findMany({
        where: whereClause,
        take: 25,
        include: {
            analyze: true
        }
    });
    
    console.log("Database Bots:", dbBots);
    
    // Se avaliation === false, retorna apenas do banco para garantir consistência
    if (filterOptions.avaliation === false) {
        return dbBots;
    }
    
    // Combina resultados do cache e banco, priorizando o banco
    const combinedResults = [
        ...dbBots,
        ...filteredFromCache.filter(cachedBot => !dbBots.some(dbBot => dbBot.id === cachedBot.id))
    ].slice(0, 25);
    
    console.log("Returning combined results:", combinedResults);
    return combinedResults;
}
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
    
    // Filtra os bots do cache baseado nos critérios
    const filteredFromCache = cachedBots.filter(bot => {
        const matchesSearch = 
            bot.name.toLowerCase().includes(focused.toLowerCase()) ||
            (bot.description && bot.description.toLowerCase().includes(focused.toLowerCase())) ||
            bot.id === focused;
        
        const matchesUserId = filterOptions.userId ? bot.userId === filterOptions.userId : true;
        
        // Lógica para filtrar por estado de avaliação
        let matchesAvaliation = true;
        if (filterOptions.avaliation !== undefined) {
            if (filterOptions.avaliation === true) {
                matchesAvaliation = bot.avaliation !== null;
            } else if (filterOptions.avaliation === false) {
                matchesAvaliation = bot.avaliation === null;
            }
            // Se for null, não filtra por avaliação (retorna ambos)
        }
        
        return matchesSearch && matchesUserId && matchesAvaliation;
    }).slice(0, 25);
    
    // Se encontrou resultados suficientes no cache, retorna
    if (filteredFromCache.length > 0) {
        return filteredFromCache;
    }
    
    // Configura a cláusula WHERE para o Prisma
    const whereClause: any = {
        OR: [
            { name: { contains: focused, mode: "insensitive" } },
            { description: { contains: focused, mode: "insensitive" } },
            { id: focused }
        ]
    };
    
    // Filtro por avaliação
    if (filterOptions.avaliation !== undefined && filterOptions.avaliation !== null) {
        if (filterOptions.avaliation === true) {
            whereClause.avaliation = { not: null };
        } else {
            whereClause.avaliation = null;
        }
    }
    
    // Filtro por userId
    if (filterOptions.userId) {
        whereClause.userId = filterOptions.userId;
    }
    
    // Busca no banco de dados
    const dbBots = await prisma.application.findMany({
        where: whereClause,
        take: 25
    });
    
    // Atualiza o cache com os novos bots encontrados
    dbBots.forEach(bot => botCache.add(bot));
    
    return dbBots;
}
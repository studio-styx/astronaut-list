import { AnalyzeInfo } from "./cache.js";

interface Bot {
    id: string;
    userId: string;
    name: string;
    votes: number;
    analyzeId: number | null;
    language: string;
    lib: string;
    description: string | null;
    prefix: string;
    prefix2: string | null;
    createdAt: Date;
    lastUpdated: Date;
    analyze: AnalyzeInfo | null;
}
export class BotCache {
    private bots: Map<string, Bot>;
    private static instance: BotCache;
    private cacheExpiration: number; // Tempo em ms (ex: 5 minutos)

    private constructor(expirationTime: number = 300000) {
        this.bots = new Map();
        this.cacheExpiration = expirationTime;
    }

    public static getInstance(): BotCache {
        if (!BotCache.instance) {
            BotCache.instance = new BotCache();
        }
        return BotCache.instance;
    }

    add(bot: Bot): void {
        bot.lastUpdated = new Date();
        this.bots.set(bot.id, bot);
    }

    remove(id: string): boolean {
        return this.bots.delete(id);
    }

    get(id: string): Bot | undefined {
        const bot = this.bots.get(id);
        if (bot && this.isCacheValid(bot.lastUpdated)) {
            return bot;
        }
        this.remove(id); // Remove se expirado
        return undefined;
    }

    getAll(): Bot[] {
        // const now = new Date();
        return Array.from(this.bots.values())
            .filter(bot => this.isCacheValid(bot.lastUpdated));
    }

    update(id: string, updateData: Partial<Bot>): boolean {
        const bot = this.bots.get(id);
        if (bot) {
            this.bots.set(id, { ...bot, ...updateData, lastUpdated: new Date() });
            return true;
        }
        return false;
    }

    // Para busca por prefixo ou outros campos
    search(query: string, field: keyof Bot = 'name'): Bot[] {
        return this.getAll().filter(bot => 
            String(bot[field]).toLowerCase().includes(query.toLowerCase())
        );
    }

    clear(): void {
        this.bots.clear();
    }

    private isCacheValid(lastUpdated?: Date): boolean {
        if (!lastUpdated) return false;
        return (Date.now() - lastUpdated.getTime()) < this.cacheExpiration;
    }
}

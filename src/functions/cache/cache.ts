import NodeCache from "node-cache";

const cache = new NodeCache({ stdTTL: 3600 }); // 1 hora de TTL

// botlist cache

export interface BotInfo {
  id: string | null | undefined;
  description: string | null | undefined;
  language: string | null | undefined;
  lib: string | null | undefined;
  prefix: string | null | undefined;
  prefix2: string | null | undefined;
}

export function getBotInfo(userId: string): BotInfo | undefined {
  return cache.get<BotInfo>(userId);
}

export function clearBotInfo(userId: string): void {
  cache.del(userId);
}

export function setBotInfo(userId: string, newInfo: Partial<BotInfo>): BotInfo {
    const existingInfo = cache.get<BotInfo>(userId) || {
      id: null,
      description: null,
      language: null,
      lib: null,
      prefix: null,
      prefix2: null
    };
  
    const updatedInfo: BotInfo = {
      ...existingInfo,
      ...newInfo
    };
  
    cache.set(userId, updatedInfo);

    return updatedInfo;
}

// general

export function getCache(name: string): any {
  return cache.get(name)
}

export function setCache(name: string, value: any): void {
  cache.set(name, value);
}

export function clearCache(name: string): void {
  cache.del(name);
}
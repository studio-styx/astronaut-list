import { rankingMenu } from "./dataAnalyse/ranking.js";
import { userMenu } from "./dataAnalyse/user.js";
import { storeMenu } from "./store.js";

export const menus = {
    dataAnalyse: {
        user: userMenu,
        ranking: rankingMenu
    },
    store: storeMenu
}
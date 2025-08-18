import { createResponder, ResponderType } from "#base";
import { res } from "#functions";
import { menus } from "#menus";

createResponder({
    customId: "store/buy/:userId",
    types: [ResponderType.StringSelect], cache: "cached",
    async run(interaction, { userId }) {
        if (interaction.user.id !== userId) {
            interaction.reply(res.danger("Você não pode usar este menu!"));
            return;
        }
        const option = interaction.values[0] as "1" | "2" | "3";

        /* 
            1 = 30% less cooldown for 1 week
            2 = 50% less cooldown for 1 week
            3 = 2x votes (or 3x if hes's booster)
        */

        interaction.update(menus.store(userId, option))
    },
});
import { createResponder, ResponderType } from "#base";
import { prisma } from "#database";
import { res, icon, Month } from "#functions";
import { menus } from "#menus";

createResponder({
    customId: "data/ranking/:month",
    types: [ResponderType.StringSelect], cache: "cached",
    async run(interaction, { month }) {
        await interaction.deferUpdate();

        const author = await prisma.user.findUnique({
            where: {
                id: interaction.user.id
            }
        })

        if (!author?.isAvaliator) {
            interaction.followUp(res.danger(`${icon.denied} | Você não é analisador.`));
            return;
        }

        const page = parseInt(interaction.values[0]);

        const analyzes = await prisma.analyze.findMany();

        const monthFormatted: Month | undefined = month === "undefined" ? undefined : month as Month | undefined;

        interaction.editReply(menus.dataAnalyse.ranking(analyzes, monthFormatted, page));
    },
});

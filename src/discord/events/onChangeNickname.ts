import { createEvent } from "#base";
import { prisma } from "#database";

createEvent({
    name: "onChangeNickname",
    event: "userUpdate",
    async run(oldUser, newUser) {
        if (oldUser.username === newUser.username) return;
        if (!newUser.bot) return;

        const bot = await prisma.application.findUnique({
            where: {
                id: newUser.id,
            },
        });

        if (!bot) return;

        await prisma.application.update({
            where: {
                id: newUser.id,
            },
            data: {
                name: newUser.username,
            },
        })

    },
});
import { createResponder, ResponderType } from "#base";
import { prisma } from "#database";
import { res, scheduleReminder } from "#functions";

createResponder({
    customId: "vote/:action/:botId/:userId",
    types: [ResponderType.Button], cache: "cached",
    async run(interaction, { action, botId, userId  }) {
        if (userId !== interaction.user.id) {
            interaction.reply(res.danger("não foi você que executou esse comando!"));
            return;
        }
        switch (action) {
            case "setDefaultVote": {
                await prisma.user.update({
                    where: {
                        id: userId
                    },
                    data: {
                        defaultVote: botId
                    }
                });
                interaction.reply(res.success("Voto padrão definido com sucesso!"));
                break;
            }
            case "removeDefaultVote": {
                await prisma.user.update({
                    where: {
                        id: userId
                    },
                    data: {
                        defaultVote: null
                    }
                });
                interaction.reply(res.success("Voto padrão removido com sucesso!"));
                break;
            }
            case "remind": {
                await interaction.deferReply();
            
                const cooldown = await prisma.cooldown.findUnique({
                    where: {
                        userId_name: {
                            userId,
                            name: "vote"
                        }
                    }
                });
            
                if (!cooldown || cooldown.endIn < new Date()) {
                    interaction.editReply("Você já pode votar!");
                    return;
                }

                const hasReminder = await prisma.voteReminder.findFirst({
                    where: {
                        userId,
                        guildId: interaction.guildId
                    }
                });

                if (hasReminder && hasReminder.endTime.getTime() === cooldown.endIn.getTime()) {
                    interaction.editReply("Você já tem um lembrete!");
                    return;
                }                
            
                interaction.editReply(`Vou te avisar quando você puder votar novamente!`);
            
                await scheduleReminder(interaction.client, {
                    userId,
                    channelId: interaction.channel?.id ?? interaction.user.dmChannel?.id ?? interaction.user.id,
                    guildId: interaction.guild.id,
                    endTime: cooldown.endIn
                });

                return;
            }
        }
    },
});
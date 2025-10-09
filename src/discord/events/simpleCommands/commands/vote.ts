import { Store } from "#base";
import { prisma } from "#database";
import { res } from "#functions";
import { settings } from "#settings";
import { createEmbed, createRow } from "@magicyan/discord";
import { ButtonBuilder, ButtonStyle, Message, OmitPartialGroupDMChannel, TextChannel } from "discord.js";;

const store = new Store<Date>();

export async function vote(message: OmitPartialGroupDMChannel<Message<boolean>>, args: string[]) {
    if (store.has(message.author.id)) {
        message.reply(res.danger(`Acalme-se! você está sendo muito rápido! volte novamente <t:${Math.floor(Number(store.get(message.author.id)) / 1000)}:R>`));
        return;
    }

    store.set(message.author.id, new Date(Date.now() + 6000), { time: 6000 });

    const user = await prisma.user.upsert({
        where: {
            id: message.author.id
        },
        create: {
            id: message.author.id
        },
        update: {},
        include: {
            cooldowns: true
        }
    });

    const botarg = args[0] || user.defaultVote;
    
    if (!botarg) {
        message.reply(res.danger("Você precisa mencionar um bot!"));
        return;
    }

    const botId = botarg.startsWith('<@') && botarg.endsWith('>')
        ? botarg.slice(2, -1) // Remove <@ and >
        : botarg;

    if (!botId) {
        message.reply(res.danger("Você precisa mencionar um bot!"));
        return;
    }

    message.channel.sendTyping();

    const now = new Date();
    const cooldown = user.cooldowns.find(cooldown => cooldown.name === "vote");

    if (cooldown && cooldown.endIn > now) {
        message.reply(res.danger(`Você ainda está em cooldown! volte novamente <t:${Math.floor(Number(cooldown.endIn) / 1000)}:R>`));
        return;
    }

    const botInfo = await message.client.users?.fetch(botId);

    if (!botInfo) {
        message.reply(res.danger("Não foi possível encontrar o bot!"));
        return;
    }

    if (!botInfo.bot) {
        message.reply(res.danger("O usuário mencionado não é um bot!"));
        return;
    }

    const bot = await prisma.application.findUnique({
        where: {
            id: botId
        },
        include: {
            analyze: true
        }
    });

    if (!bot) {
        message.reply(res.danger("O bot mencionado não está na lista de bots!"));
        return;
    }

    if (!bot?.analyze || !bot?.analyze?.finishedIn) {
        message.reply(res.danger("O bot mencionado ainda não foi analisado!"));
        return;
    }

    const hasRole = message.member?.roles.cache.has("1348957298835587085") // 1348957298835587085 = id do cargo de booster

    await prisma.$transaction([
        prisma.votes.create({
            data: {
                applicationId: bot.id,
                userId: message.author.id,
                origin: "SERVER"
            }
        }),
        prisma.cooldown.upsert({
            where: {
                userId_name: {
                    userId: message.author.id,
                    name: "vote"
                }
            },
            create: {
                userId: message.author.id,
                name: "vote",
                endIn: new Date(now.getTime() + 1000 * 60 * 60 * 3) // 1000 * 60 * 60 * 3
            },
            update: {
                endIn: new Date(now.getTime() + 1000 * 60 * 60 * 3)
            }
        }),
        prisma.user.update({
            where: { id: message.author.id },
            data: {
                coins: { increment: hasRole ? 700 : 500 }
            }
        })
    ])

    const newBot = await prisma.application.findUniqueOrThrow({
        where: {
            id: botId
        },
        include: {
            votes: true
        }
    });

    const description = hasRole
        ? `Você votou na aplicação ${bot.name} de <@${bot.userId}>, como você é booster do server o bot ganhou **2** votos! agora ele possui **${newBot.votes}** votos. \n\n Você ganhou **700** planetas`
        : `Você votou na aplicação ${bot.name} de <@${bot.userId}>, que agora possui **${newBot.votes.length}** votos. \n\n Você ganhou **500** planetas`;

    const embed = createEmbed({
        title: "Aplicação votada",
        description,
        color: settings.colors.success,
        timestamp: now.toISOString()
    });

    const components = createRow(
        new ButtonBuilder({
            customId: `vote/setDefaultVote/${bot.id}/${message.author.id}`,
            label: "Definir como voto padrão",
            style: ButtonStyle.Success,
            disabled: user.defaultVote === bot.id
        }),
        new ButtonBuilder({
            customId: `vote/removeDefaultVote/null/${message.author.id}`,
            label: "Remover voto padrão",
            style: ButtonStyle.Danger,
            disabled: !user.defaultVote
        }),
        new ButtonBuilder({
            customId: `vote/remind/null/${message.author.id}`,
            label: "Lembrar-me de votar novamente",
            style: ButtonStyle.Secondary
        })
    )

    const channel = await message.client.channels.fetch(settings.guild.channels.vote)
    
    if (!channel || !channel.isTextBased()) {
        message.reply(res.danger("Não foi possível enviar a notificação nos correios, "));
        return;
    }

    const botUser = await message.client.users.fetch(bot.id);
    (channel as TextChannel).send(res.success(`<@${message.author.id}> votou na aplicação ${bot.name} de <@${bot.userId}> ${hasRole ? "como o usuário é booster seu voto valeu 2!" : ""}, agora a aplicação tem: **${newBot.votes}** votos! \n\n ( \`Agora ele espera 3 horas pra poder votar novamente\` )`, { thumbnail: botUser.displayAvatarURL() }));

    message.reply({
        embeds: [embed],
        components: [components]
    })
    return;
}
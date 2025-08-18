import { createResponder, ResponderType } from "#base";
import { prisma } from "#database";
import { res } from "#functions";
import { menus } from "#menus";
import { env } from "#settings";
import { createModalFields } from "@magicyan/discord";
import axios, { AxiosError } from "axios";
import { TextInputStyle } from "discord.js";

createResponder({
    customId: "store/:action/:item/:quantityST/:userId",
    types: [ResponderType.Button, ResponderType.ModalComponent], cache: "cached",
    async run(interaction, { action, item, userId, quantityST }) {
        if (interaction.user.id !== userId) {
            interaction.reply(res.danger("Você não pode usar este menu!"));
            return;
        }

        if (action === "quantity") {
            if (interaction.isButton()) {
                interaction.showModal({
                    customId: `store/quantity/${item}/0/${userId}`,
                    title: "Adicionar Aplicação",
                    components: createModalFields({
                        quantity: {
                            label: "Quantidade",
                            placeholder: "Digite a quantidade de itens que vc quer comprar",
                            style: TextInputStyle.Short,
                            required: true,
                            maxLength: 2,
                            minLength: 1
                        }
                    })
                })
            } else {
                const quantityText = interaction.fields.getTextInputValue("quantity");

                const quantity = Number.parseInt(quantityText);

                if (isNaN(quantity)) {
                    interaction.reply(res.danger("Quantidade inválida! digite um número inteiro válido"));
                    return;
                }

                if (quantity < 1) {
                    interaction.reply(res.danger("Quantidade inválida! digite um número maior que 0"))
                    return;
                }

                interaction.update(menus.store(userId, item as "1" | "2" | "3", quantity));
            }
            return;
        } else {
            if (interaction.isModalSubmit()) return;

            const itens = {
                "1": {
                    name: "30% menos cooldown",
                    price: 150
                },
                "2": {
                    name: "50% menos cooldown",
                    price: 230
                },
                "3": {
                    name: "2x votos",
                    price: 180
                }
            };

            const selectedItem = itens[item as keyof typeof itens];

            if (!selectedItem) {
                interaction.reply(res.danger("Esse item não existe!"));
                return;
            };

            const quantity = Number.parseInt(quantityST);

            if (isNaN(quantity)) {
                interaction.reply(res.danger("Quantidade inválida!"));
                return;
            }

            const priceToPay = selectedItem.price * quantity;
            
            let userMoney: number = 0;

            await interaction.deferReply();

            try {
                const userBalance = await axios.get(`https://apieris.squareweb.app/v1/economy/balance/${userId}`, {
                    headers: {
                        authorization: env.ERIS_API_KEY
                    }
                });

                userMoney = userBalance.data.money;
            } catch (error) {
                console.error(error);
                interaction.editReply(res.danger("Não foi possível verificar seu saldo!"));
                return;
            }

            if (userMoney < priceToPay) {
                interaction.editReply(res.danger("Você não tem dinheiro suficiente!"));
                return;
            }

            try {
                await interaction.editReply(res.warning("Por favor aceite a solicitação!"))
                await axios.post("https://apieris.squareweb.app/v1/economy/take-stx", {
                    guildId: interaction.guildId,
                    channelId: interaction.channelId,
                    memberId: interaction.member.id,
                    amount: priceToPay,
                    reason: `Compra de ${quantity} itens do item ${selectedItem.name} por ${selectedItem.price} stx cada!`
                }, {
                    headers: {
                        authorization: env.ERIS_API_KEY
                    },
                    timeout: 80000 // 1 minuto e 20 segundos em milissegundos
                });

                const prismaItem = await prisma.item.upsert({
                    where: {
                        userId_id: {
                            userId,
                            id: Number(item)
                        }
                    },
                    create: {
                        userId,
                        id: Number(item),
                        quantity,
                        expiresAt: item === "3" ? new Date(Date.now() + (3 * 24 * 60 * 60 * 1000) * quantity) : new Date(Date.now() + (7 * 24 * 60 * 60 * 1000) * quantity)
                    },
                    update: {
                        quantity: {
                            increment: quantity
                        },
                        expiresAt: item === "3" ? new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                    }
                });

                interaction.editReply(res.success(`Você pagou **${priceToPay}** stx para comprar **${quantity}** itens do item **${selectedItem.name}** ${prismaItem.quantity !== quantity ? `Agora vc tem **${prismaItem.quantity}** itens desse item!` : ""}`))
                return;
            } catch (error) {
                if (error instanceof AxiosError) {
                    interaction.editReply(res.danger(`Não foi possível processar sua solicitação pelo motivo: **\`${error.response?.data.error || error.response?.data.message || "Unknown error"}\`**`))
                } else {
                    interaction.editReply(res.danger("Não foi possível processar sua solicitação!"))
                };
                return;
            }
        }
    },
});
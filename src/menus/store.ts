import { settings } from "#settings";
import { brBuilder, createContainer, createRow, createSeparator } from "@magicyan/discord";
import { ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, type InteractionReplyOptions } from "discord.js";

export function storeMenu<R>(userId: string, selectedItem?: "1" | "2" | "3", quantity?: number): R {
    const container = createContainer(settings.colors.azoxo,
        brBuilder(
            "## Loja Astronaut"
        ),
        createSeparator(),
        brBuilder(
            "Seja bem vindo a loja do nosso servidor! aqui você paga com **stx** da **Éris**, o dinheiro que vc ganha lá vc pode usar aqui também!",
            "Veja os itens disponiveis para compra abaixo:",
        ),
        brBuilder(
            "## 30% menor cooldown",
            "-# Ao votar, receba menos 30% de cooldown para votar novamente, dura 1 semana",
            "Custo: **\`150 stx\`**",
            selectedItem === "1" && quantity ? `Você escolheu **${quantity}** desse item` : null
        ),
        brBuilder(
            "## 50% menor cooldown",
            "-# Ao votar, receba menos 50% de cooldown para votar novamente, dura 1 semana",
            "Custo: **\`230 stx\`**",
            selectedItem === "2" && quantity ? `Você escolheu **${quantity}** desse item` : null
        ),
        brBuilder(
            "## 2x votos",
            "-# Durante 3 dias, cada voto seu valerá 2 (se for booster então valerá 3)",
            "Custo: **\`180 stx\`**",
            selectedItem === "3" && quantity ? `Você escolheu **${quantity}** desse item` : null
        )
    );

    const rows = [
        createRow(
            new StringSelectMenuBuilder({
                custom_id: `store/buy/${userId}`,
                placeholder: "Escolha um item para comprar",
                options: [
                    { label: "30% menor cooldown", value: "1", description: "O voto dura 30% menos", default: selectedItem === "1" },
                    { label: "50% menor cooldown", value: "2", description: "O voto dura 50% menos", default: selectedItem === "2" },
                    { label: "2x votos", value: "3", description: "O voto vale 2x", default: selectedItem === "3" }
                ],
            })
        ),
        createRow(
            new ButtonBuilder({
                customId: `store/quantity/${selectedItem || "0"}/0/${userId}`,
                label: "Quantidade",
                style: ButtonStyle.Secondary,
                disabled: !selectedItem,
            }),
            new ButtonBuilder({
                customId: `store/buy/${selectedItem || "0"}/${quantity || 0}/${userId}`,
                label: "Comprar",
                style: ButtonStyle.Success,
                disabled: !selectedItem || !quantity,
            }),
        )
    ]

    return ({
        flags: ["IsComponentsV2"],
        components: [container, ...rows]
    } satisfies InteractionReplyOptions) as R;
}
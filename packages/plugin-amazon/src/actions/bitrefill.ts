import { type Action } from "@elizaos/core";
import { getBitrefillProvider } from "../providers/bitrefillProvider";

export const bitrefillGiftCardAction: Action = {
    name: "BITREFILL_GIFTCARD",
    description: "Purchase Amazon gift cards through Bitrefill using crypto",
    similes: [
        "add $* to amazon",
        "buy $* amazon gift card",
        "purchase $* amazon card",
        "get $* amazon gift card",
    ],

    validate: async (runtime, message) => {
        const text = message.content.text.toLowerCase();
        const dollarAmounts = text.match(/\$?(\d+)/);
        return (
            dollarAmounts !== null &&
            [5, 10, 20, 50, 100, 200, 500, 1000, 2000].includes(
                parseInt(dollarAmounts[1])
            )
        );
    },

    handler: async (runtime, message) => {
        try {
            const text = message.content.text.toLowerCase();
            const dollarAmounts = text.match(/\$?(\d+)/);

            if (!dollarAmounts) {
                await runtime.messageManager.createMemory({
                    userId: runtime.agentId,
                    roomId: message.roomId,
                    agentId: runtime.agentId,
                    content: {
                        text: "I couldn't determine the gift card amount. Please specify an amount like '$100'.",
                        action: "BITREFILL_GIFTCARD",
                    },
                });
                return false;
            }

            const amount = parseInt(dollarAmounts[1]);
            if (![5, 10, 20, 50, 100, 200, 500, 1000, 2000].includes(amount)) {
                await runtime.messageManager.createMemory({
                    userId: runtime.agentId,
                    roomId: message.roomId,
                    agentId: runtime.agentId,
                    content: {
                        text: "Please choose from available denominations: $5, $10, $20, $50, $100, $200, $500, $1000, or $2000",
                        action: "BITREFILL_GIFTCARD",
                    },
                });
                return false;
            }

            await runtime.messageManager.createMemory({
                userId: runtime.agentId,
                roomId: message.roomId,
                agentId: runtime.agentId,
                content: {
                    text: `I'll help you purchase a $${amount} Amazon gift card through Bitrefill using USDC on Solana.`,
                    action: "BITREFILL_GIFTCARD",
                },
            });

            // Get the Bitrefill provider instance
            const bitrefillProvider = getBitrefillProvider();
            const purchaseResult =
                await bitrefillProvider.purchaseBitrefillGiftCard(amount);

            if (purchaseResult) {
                await runtime.messageManager.createMemory({
                    userId: runtime.agentId,
                    roomId: message.roomId,
                    agentId: runtime.agentId,
                    content: {
                        text: "Successfully initiated the gift card purchase on Bitrefill!",
                        action: "BITREFILL_GIFTCARD",
                    },
                });
                return true;
            } else {
                await runtime.messageManager.createMemory({
                    userId: runtime.agentId,
                    roomId: message.roomId,
                    agentId: runtime.agentId,
                    content: {
                        text: "I encountered an error while trying to purchase the gift card. Please try again later.",
                        action: "BITREFILL_GIFTCARD",
                    },
                });
                return false;
            }
        } catch (error) {
            console.error("Error in Bitrefill gift card handler:", error);
            await runtime.messageManager.createMemory({
                userId: runtime.agentId,
                roomId: message.roomId,
                agentId: runtime.agentId,
                content: {
                    text: "I encountered an error while trying to purchase the gift card. Please try again later.",
                    action: "BITREFILL_GIFTCARD",
                },
            });
            return false;
        }
    },

    examples: [
        [
            {
                user: "{{user1}}",
                content: { text: "add $100 to amazon" },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "I'll help you purchase a $100 Amazon gift card through Bitrefill.",
                    action: "BITREFILL_GIFTCARD",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: { text: "buy $50 amazon gift card" },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "I'll help you purchase a $50 Amazon gift card through Bitrefill using USDC on Solana.",
                    action: "BITREFILL_GIFTCARD",
                },
            },
        ],
    ],
} as Action;

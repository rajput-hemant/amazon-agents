import { type Action } from "@elizaos/core";
import { AmazonProvider } from "../providers/amazonProvider";

export const amazonCheckoutAction: Action = {
    name: "AMAZON_CHECKOUT",
    description: "Handle requests to proceed to checkout on Amazon.",
    preventDefaultResponse: true,
    similes: [
        "CHECKOUT_AMAZON",
        "PROCEED_TO_CHECKOUT",
        "BUY_NOW",
        "COMPLETE_PURCHASE",
    ],
    validate: async (runtime, message) => {
        const text = message.content.text.toLowerCase();

        // Keywords that indicate checkout intent
        const checkoutKeywords = [
            "checkout",
            "check out",
            "proceed to checkout",
            "complete purchase",
            "place order",
            "buy it now",
            "finish purchase",
            "pay now",
        ];

        // Check if the message is ONLY about checking out
        // This prevents overlap with product search
        const isOnlyCheckout = checkoutKeywords.some(
            (keyword) => text.includes(keyword) && text.split(" ").length <= 5 // Short messages are likely checkout commands
        );

        // If it's a longer message, make sure it's specifically about proceeding to checkout
        const isProceedToCheckout =
            text.includes("proceed to checkout") ||
            text.includes("go to checkout") ||
            (text.includes("checkout") && text.includes("cart"));

        return isOnlyCheckout || isProceedToCheckout;
    },
    handler: async (runtime, message): Promise<boolean> => {
        try {
            const amazonProvider = AmazonProvider.getInstance();
            await amazonProvider.init();

            // Check if logged in first
            const isLoggedIn = await amazonProvider.isLoggedIn();
            if (!isLoggedIn) {
                await runtime.messageManager.createMemory({
                    userId: runtime.agentId,
                    roomId: message.roomId,
                    agentId: runtime.agentId,
                    content: {
                        text: "You need to be logged in to proceed to checkout. Let me help you log in first...",
                        action: "AMAZON_CHECKOUT",
                    },
                });

                const loginSuccess = await amazonProvider.login();
                if (!loginSuccess) {
                    await runtime.messageManager.createMemory({
                        userId: runtime.agentId,
                        roomId: message.roomId,
                        agentId: runtime.agentId,
                        content: {
                            text: "I couldn't log in to your Amazon account. Please make sure your credentials are correct and try again.",
                            action: "AMAZON_CHECKOUT",
                        },
                    });
                    return false;
                }
            }

            // Now that we're logged in, send checkout acknowledgment
            await runtime.messageManager.createMemory({
                userId: runtime.agentId,
                roomId: message.roomId,
                agentId: runtime.agentId,
                content: {
                    text: "I'll help you proceed to checkout on Amazon. One moment please...",
                    action: "AMAZON_CHECKOUT",
                },
            });

            // Navigate to cart and proceed to checkout
            const checkoutSuccess = await amazonProvider.proceedToCheckout();

            if (checkoutSuccess) {
                await runtime.messageManager.createMemory({
                    userId: runtime.agentId,
                    roomId: message.roomId,
                    agentId: runtime.agentId,
                    content: {
                        text: "I've taken you to the checkout page. Please review your order and complete the purchase.",
                        action: "AMAZON_CHECKOUT",
                    },
                });
                return true;
            } else {
                await runtime.messageManager.createMemory({
                    userId: runtime.agentId,
                    roomId: message.roomId,
                    agentId: runtime.agentId,
                    content: {
                        text: "I couldn't proceed to checkout. Please make sure you have items in your cart and try again.",
                        action: "AMAZON_CHECKOUT",
                    },
                });
                return false;
            }
        } catch (error) {
            console.error("Error in Amazon checkout handler:", error);
            await runtime.messageManager.createMemory({
                userId: runtime.agentId,
                roomId: message.roomId,
                agentId: runtime.agentId,
                content: {
                    text: "I encountered an error while trying to proceed to checkout. Please try again.",
                    action: "AMAZON_CHECKOUT",
                },
            });
            return false;
        }
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Let's checkout on Amazon",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "I'll help you proceed to checkout on Amazon. One moment please...",
                    action: "AMAZON_CHECKOUT",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Complete my purchase on Amazon",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "I'll help you proceed to checkout on Amazon. One moment please...",
                    action: "AMAZON_CHECKOUT",
                },
            },
        ],
    ],
} as Action;

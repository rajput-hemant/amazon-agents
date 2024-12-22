import {
    ActionExample,
    IAgentRuntime,
    Memory,
    type Action,
} from "@elizaos/core";
import { amazonProvider } from "../providers/amazonProvider";

export const amazonOrderAction: Action = {
    name: "AMAZON_ORDER",
    similes: [
        "ORDER_FROM_AMAZON",
        "BUY_FROM_AMAZON",
        "PURCHASE_ON_AMAZON",
        "SHOP_ON_AMAZON",
    ],
    validate: async (runtime: IAgentRuntime, message: Memory) => {
        const text = message.content.text.toLowerCase();

        // Shopping-related keywords
        const shoppingKeywords = [
            "order",
            "buy",
            "purchase",
            "get",
            "shop",
            "shopping",
            "cart",
            "checkout",
            "charger",
            "product",
            "item",
        ];

        // Must contain amazon and at least one shopping keyword
        const hasAmazon = text.includes("amazon");
        const hasShopping = shoppingKeywords.some((keyword) =>
            text.includes(keyword)
        );

        return hasAmazon && hasShopping;
    },
    description:
        "Handle requests to order items from Amazon. This action is triggered when users want to purchase something from Amazon.",
    handler: async (
        runtime: IAgentRuntime,
        message: Memory
    ): Promise<boolean> => {
        try {
            // Extract the product query from the message
            const text = message.content.text.toLowerCase();
            const query = text
                .replace(/amazon|order|buy|purchase|from|on|at/gi, "")
                .trim();

            // Initialize the provider and search for products
            await amazonProvider.init();
            const products = await amazonProvider.searchProduct(query);

            // Format the results
            const formattedResults = products
                .map(
                    (product, index) =>
                        `${index + 1}. ${product.title}\n   Price: ${product.price}\n   Rating: ${product.rating}\n`
                )
                .join("\n");

            // Create response memory
            const responseMemory: Memory = {
                userId: runtime.agentId,
                roomId: message.roomId,
                agentId: runtime.agentId,
                content: {
                    text: `HERE ARE SOME GREAT AMERICAN OPTIONS I FOUND ON AMAZON:\n\n${formattedResults}\n\nWHICH ONE WOULD YOU LIKE TO ORDER? (JUST TELL ME THE NUMBER!)`,
                },
            };

            // Send the results back to the user
            await runtime.messageManager.createMemory(responseMemory);

            return true;
        } catch (error) {
            console.error("Error in Amazon order handler:", error);
            const errorMemory: Memory = {
                userId: runtime.agentId,
                roomId: message.roomId,
                agentId: runtime.agentId,
                content: {
                    text: "SORRY FOLKS, HAVING SOME TECHNICAL DIFFICULTIES WITH AMAZON RIGHT NOW. BLAME THE RADICAL LEFT'S INTERNET REGULATIONS! TRY AGAIN IN A MOMENT.",
                },
            };
            await runtime.messageManager.createMemory(errorMemory);
            return false;
        } finally {
            // Clean up browser resources
            await amazonProvider.cleanup();
        }
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Can you order a phone charger from Amazon for me?",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "I'll help you order a phone charger from Amazon. Could you specify what type of phone charger you need?",
                    action: "AMAZON_ORDER",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: { text: "I need to buy some headphones on Amazon" },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "I'll help you find some headphones on Amazon. What's your budget and do you have any specific requirements?",
                    action: "AMAZON_ORDER",
                },
            },
        ],
    ] as ActionExample[][],
} as Action;

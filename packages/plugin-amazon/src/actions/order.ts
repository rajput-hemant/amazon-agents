import {
    ActionExample,
    IAgentRuntime,
    Memory,
    type Action,
} from "@elizaos/core";
import { AmazonProvider } from "../providers/amazonProvider";

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
            // Get the Amazon provider instance
            const amazonProvider = AmazonProvider.getInstance();

            // Extract the product query from the message
            const text = message.content.text.toLowerCase();

            // Extract what's being searched for by removing just the action words
            let query = text;
            const removeWords = ["amazon", "from", "on", "at"];
            removeWords.forEach((word) => {
                query = query.replace(new RegExp(`\\b${word}\\b`, "gi"), "");
            });
            query = query.trim();

            console.log("Original text:", text);
            console.log("Extracted query:", query);

            // Initialize the provider and search for products
            await amazonProvider.init();
            const products = await amazonProvider.searchProduct(query);

            if (products.length > 0) {
                // Add first product to cart
                await amazonProvider.addToCart(products[0].link);
                console.log("Added first product to cart:", products[0].title);
            }

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
                    text: `I'VE ADDED THE FIRST ITEM TO YOUR CART! HERE ARE ALL THE OPTIONS I FOUND:\n\n${formattedResults}\n\nTHE FIRST ITEM HAS BEEN ADDED TO YOUR CART! WOULD YOU LIKE TO CHECKOUT NOW?`,
                },
            };

            // Send the results back to the user
            await runtime.messageManager.createMemory(responseMemory);

            return true;
        } catch (error: unknown) {
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
            // Don't cleanup - keep the browser session alive for cookie reuse
            // await amazonProvider.cleanup();
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

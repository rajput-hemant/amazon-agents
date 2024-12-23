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
            // 1. First extract and clean the query
            const text = message.content.text.toLowerCase();
            console.log("Original text:", text);

            // Extract what's being searched for by removing action words and common phrases
            let query = text;
            const removeWords = [
                "amazon",
                "from",
                "on",
                "at",
                "order",
                "buy",
                "purchase",
                "get",
                "can you",
                "please",
                "need to",
                "want to",
                "looking for",
                "search for",
                "find",
                "me",
                "a",
                "an",
                "the",
            ];

            // Remove all the words that might be part of the prompt
            removeWords.forEach((word) => {
                query = query.replace(new RegExp(`\\b${word}\\b`, "gi"), "");
            });

            // Clean up extra spaces and punctuation
            query = query.replace(/\s+/g, " ").trim();
            console.log("Cleaned query:", query);

            // 2. Validate the query
            if (!query) {
                console.log("No product query found after cleaning");
                const noQueryMemory: Memory = {
                    userId: runtime.agentId,
                    roomId: message.roomId,
                    agentId: runtime.agentId,
                    content: {
                        text: "I'd be happy to help you shop on Amazon! What specific item would you like me to find?",
                    },
                };
                await runtime.messageManager.createMemory(noQueryMemory);
                return false;
            }

            // 3. Only now get the provider instance and initialize browser
            console.log("Starting Amazon search for:", query);
            const amazonProvider = AmazonProvider.getInstance();
            await amazonProvider.init();

            // 4. Search for products
            const products = await amazonProvider.searchProduct(query);

            if (products.length === 0) {
                console.log("No products found for query:", query);
                const noProductsMemory: Memory = {
                    userId: runtime.agentId,
                    roomId: message.roomId,
                    agentId: runtime.agentId,
                    content: {
                        text: `I couldn't find any products matching "${query}" on Amazon. Could you try describing what you're looking for differently?`,
                    },
                };
                await runtime.messageManager.createMemory(noProductsMemory);
                return false;
            }

            // 5. Add first product to cart
            const addToCartResult = await amazonProvider.addToCart(
                products[0].link
            );
            if (!addToCartResult) {
                throw new Error("Failed to add product to cart");
            }
            console.log("Added first product to cart:", products[0].title);

            // Format the results
            const formattedResults = products
                .map(
                    (product, index) =>
                        `${index + 1}. ${product.title}\n   Price: ${product.price}\n   Link: ${product.link}\n`
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
                    text: "I encountered an error while trying to process your Amazon order. Please try again.",
                },
            };
            await runtime.messageManager.createMemory(errorMemory);
            return false;
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

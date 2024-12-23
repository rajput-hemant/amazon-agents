import { generateText, ModelClass, type Action } from "@elizaos/core";
import { AMAZON_KEYWORDS, SHOPPING_KEYWORDS } from "../lib/constants";
import { AmazonProvider } from "../providers/amazonProvider";

export const amazonOrderAction: Action = {
    name: "AMAZON_ORDER",
    description:
        "Handle requests to order items from Amazon. This action is triggered when users want to purchase something from Amazon.",

    similes: [
        "ORDER_FROM_AMAZON",
        "BUY_FROM_AMAZON",
        "PURCHASE_ON_AMAZON",
        "SHOP_ON_AMAZON",
    ],
    validate: async (runtime, message) => {
        const text = message.content.text.toLowerCase();

        const hasAmazon = AMAZON_KEYWORDS.some((keyword) =>
            text.includes(keyword)
        );
        const hasShopping = SHOPPING_KEYWORDS.some((keyword) =>
            text.includes(keyword)
        );

        return hasAmazon && hasShopping;
    },
    handler: async (runtime, message): Promise<boolean> => {
        try {
            const template = `
            You are a helpful assistant that can help me shop on Amazon.
            Extract out the product and any relevant information from the following text:
            ${message.content.text}

            Make sure to only include relevant information and nothing else.

            Example:
            Text: "I need to buy a phone charger from Amazon. It should be a USB-C charger and compatible with my iPhone 15."
            Output: USB-C charger
            `;

            const query = await generateText({
                runtime,
                context: template,
                modelClass: ModelClass.SMALL,
            });

            if (!query) {
                console.log("No product query found after cleaning");
                await runtime.messageManager.createMemory({
                    userId: runtime.agentId,
                    roomId: message.roomId,
                    agentId: runtime.agentId,
                    content: {
                        text: "I'd be happy to help you shop on Amazon! What specific item would you like me to find?",
                    },
                });
                return false;
            }

            console.log("Starting Amazon search for:", query);
            const amazonProvider = AmazonProvider.getInstance();
            await amazonProvider.init();

            const products = await amazonProvider.searchProduct(query);

            if (products.length === 0) {
                console.log("No products found for query:", query);
                await runtime.messageManager.createMemory({
                    userId: runtime.agentId,
                    roomId: message.roomId,
                    agentId: runtime.agentId,
                    content: {
                        text: `I couldn't find any products matching "${query}" on Amazon. Could you try describing what you're looking for differently?`,
                    },
                });
                return false;
            }

            const addToCartResult = await amazonProvider.addToCart(
                products[0].link
            );

            if (!addToCartResult) {
                throw new Error("Failed to add product to cart");
            }

            const formattedResults = products
                .map(
                    ({ title, link, price }, i) =>
                        `${i + 1}. ${title}\n   Price: ${price}\n   Link: ${link}\n`
                )
                .join("\n");

            await runtime.messageManager.createMemory({
                userId: runtime.agentId,
                roomId: message.roomId,
                agentId: runtime.agentId,
                content: {
                    text: `I'VE ADDED THE FIRST ITEM TO YOUR CART! HERE ARE ALL THE OPTIONS I FOUND:\n\n${formattedResults}\n\nTHE FIRST ITEM HAS BEEN ADDED TO YOUR CART! WOULD YOU LIKE TO CHECKOUT NOW?`,
                },
            });

            return true;
        } catch (error: unknown) {
            console.error("Error in Amazon order handler:", error);
            await runtime.messageManager.createMemory({
                userId: runtime.agentId,
                roomId: message.roomId,
                agentId: runtime.agentId,
                content: {
                    text: "I encountered an error while trying to process your Amazon order. Please try again.",
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
    ],
} as Action;

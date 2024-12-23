import { generateText, ModelClass, type Action } from "@elizaos/core";
import { AMAZON_KEYWORDS, SHOPPING_KEYWORDS } from "../lib/constants";
import { AmazonProvider } from "../providers/amazonProvider";

export const amazonOrderAction: Action = {
    name: "AMAZON_ORDER",
    description:
        "Handle requests to order items from Amazon. This action is triggered when users want to purchase something from Amazon.",
    preventDefaultResponse: true,
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
            // First, send an acknowledgment
            await runtime.messageManager.createMemory({
                userId: runtime.agentId,
                roomId: message.roomId,
                agentId: runtime.agentId,
                content: {
                    text: "I'll help you find that on Amazon. Let me search...",
                    action: "AMAZON_ORDER",
                },
            });

            // Extract the query
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
                await runtime.messageManager.createMemory({
                    userId: runtime.agentId,
                    roomId: message.roomId,
                    agentId: runtime.agentId,
                    content: {
                        text: "Could you please specify what exactly you're looking for on Amazon?",
                        action: "AMAZON_ORDER",
                    },
                });
                return true;
            }

            console.log("Starting Amazon search for:", query);
            const amazonProvider = AmazonProvider.getInstance();
            await amazonProvider.init();

            const products = await amazonProvider.searchProduct(query);

            if (products.length === 0) {
                await runtime.messageManager.createMemory({
                    userId: runtime.agentId,
                    roomId: message.roomId,
                    agentId: runtime.agentId,
                    content: {
                        text: `I couldn't find any products matching "${query}" on Amazon. Could you try describing what you're looking for differently?`,
                        action: "AMAZON_ORDER",
                    },
                });
                return true;
            }

            // Try to add the first product to cart
            const addToCartResult = await amazonProvider.addToCart(
                products[0].link
            );

            // Format product results with better structure
            const formattedResults = products
                .map(({ title, price }, i) => {
                    const cleanTitle = title.replace(/\s+/g, " ").trim();
                    const cleanPrice = price.replace(/\$+/g, "$").trim();
                    return `${i + 1}. ${cleanTitle}\n   Price: ${cleanPrice}`;
                })
                .join("\n\n");

            // Create the final message
            await runtime.messageManager.createMemory({
                userId: runtime.agentId,
                roomId: message.roomId,
                agentId: runtime.agentId,
                content: {
                    text: `Here are the products I found on Amazon:\n\n${formattedResults}\n\n${
                        addToCartResult
                            ? "I've successfully added the item to your cart. Would you like to proceed to checkout?"
                            : "I found these items but couldn't add them to cart automatically. Would you like to view them on Amazon?"
                    }`,
                    action: "AMAZON_ORDER",
                    metadata: {
                        products,
                        addedToCart: addToCartResult,
                        searchQuery: query,
                    },
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
                    text: "I encountered an error while searching Amazon. Please try again.",
                    action: "AMAZON_ORDER",
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

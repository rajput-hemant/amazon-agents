import { Evaluator, IAgentRuntime, Memory } from "@elizaos/core";

export const amazonEvaluator: Evaluator = {
    name: "AMAZON_SHOPPING_INTENT",
    description:
        "Evaluates if the user's message indicates an intent to shop on Amazon",
    similes: ["AMAZON_INTENT", "SHOPPING_INTENT"],

    validate: async (runtime: IAgentRuntime, message: Memory) => {
        return message.content.text.toLowerCase().includes("amazon");
    },

    handler: async (
        runtime: IAgentRuntime,
        message: Memory
    ): Promise<number> => {
        const text = message.content.text.toLowerCase();

        // Keywords that indicate Amazon shopping intent
        const amazonKeywords = ["amazon", "prime"];
        const shoppingKeywords = ["buy", "order", "purchase", "get", "shop"];

        let score = 0;

        // Check for Amazon mentions
        if (amazonKeywords.some((keyword) => text.includes(keyword))) {
            score += 0.5;

            // Check for shopping intent
            if (shoppingKeywords.some((keyword) => text.includes(keyword))) {
                score += 0.5;
            }

            // Additional context-specific boosts
            if (text.includes("price") || text.includes("cost")) score += 0.1;
            if (text.includes("link") || text.includes("product")) score += 0.1;
        }

        return Math.min(score, 1);
    },

    examples: [],
};

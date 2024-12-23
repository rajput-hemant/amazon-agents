import { Evaluator } from "@elizaos/core";
import { AMAZON_KEYWORDS, SHOPPING_KEYWORDS } from "../lib/constants";

export const amazonEvaluator: Evaluator = {
    name: "AMAZON_SHOPPING_INTENT",
    description:
        "Evaluates if the user's message indicates an intent to shop on Amazon",

    similes: ["AMAZON_INTENT", "SHOPPING_INTENT"],

    validate: async (runtime, message) => {
        return message.content.text.toLowerCase().includes("amazon");
    },

    handler: async (runtime, message): Promise<number> => {
        const text = message.content.text.toLowerCase();

        let score = 0;

        // Check for Amazon mentions
        if (AMAZON_KEYWORDS.some((keyword) => text.includes(keyword))) {
            score += 0.5;

            // Check for shopping intent
            if (SHOPPING_KEYWORDS.some((keyword) => text.includes(keyword))) {
                score += 0.5;
            }

            if (
                ["price", "cost", "link", "product"].some((keyword) =>
                    text.includes(keyword)
                )
            )
                score += 0.1;
        }

        return Math.min(score, 1);
    },

    examples: [],
};

import { type Action } from "@elizaos/core";
import { AmazonProvider } from "../providers/amazonProvider";

export const amazonLoginAction: Action = {
    name: "AMAZON_LOGIN",
    description:
        "Handle Amazon login requests and ensure user is authenticated.",
    preventDefaultResponse: true,
    similes: ["LOGIN_AMAZON", "SIGNIN_AMAZON", "AUTHENTICATE_AMAZON"],
    validate: async (runtime, message) => {
        const text = message.content.text.toLowerCase();

        // Keywords that indicate login intent
        const loginKeywords = [
            "login",
            "log in",
            "sign in",
            "signin",
            "authenticate",
            "connect to amazon",
            "amazon account",
        ];

        return loginKeywords.some((keyword) => text.includes(keyword));
    },
    handler: async (runtime, message): Promise<boolean> => {
        try {
            // Send initial acknowledgment
            await runtime.messageManager.createMemory({
                userId: runtime.agentId,
                roomId: message.roomId,
                agentId: runtime.agentId,
                content: {
                    text: "I'll help you log in to Amazon. One moment please...",
                    action: "AMAZON_LOGIN",
                },
            });

            const amazonProvider = AmazonProvider.getInstance();
            await amazonProvider.init();

            // Check if already logged in
            const isLoggedIn = await amazonProvider.isLoggedIn();
            if (isLoggedIn) {
                await runtime.messageManager.createMemory({
                    userId: runtime.agentId,
                    roomId: message.roomId,
                    agentId: runtime.agentId,
                    content: {
                        text: "You're already logged in to Amazon! What would you like to do next?",
                        action: "AMAZON_LOGIN",
                    },
                });
                return true;
            }

            // Attempt login
            const loginSuccess = await amazonProvider.login();
            if (loginSuccess) {
                await runtime.messageManager.createMemory({
                    userId: runtime.agentId,
                    roomId: message.roomId,
                    agentId: runtime.agentId,
                    content: {
                        text: "Successfully logged in to Amazon! What would you like to do next?",
                        action: "AMAZON_LOGIN",
                    },
                });
                return true;
            } else {
                await runtime.messageManager.createMemory({
                    userId: runtime.agentId,
                    roomId: message.roomId,
                    agentId: runtime.agentId,
                    content: {
                        text: "I couldn't log in to your Amazon account. Please make sure your credentials (AMAZON_EMAIL and AMAZON_PASSWORD) are correctly set and try again.",
                        action: "AMAZON_LOGIN",
                    },
                });
                return false;
            }
        } catch (error) {
            console.error("Error in Amazon login handler:", error);
            await runtime.messageManager.createMemory({
                userId: runtime.agentId,
                roomId: message.roomId,
                agentId: runtime.agentId,
                content: {
                    text: "I encountered an error while trying to log in to Amazon. Please try again.",
                    action: "AMAZON_LOGIN",
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
                    text: "Login to my Amazon account",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "I'll help you log in to Amazon. One moment please...",
                    action: "AMAZON_LOGIN",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Sign in to Amazon",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "I'll help you log in to Amazon. One moment please...",
                    action: "AMAZON_LOGIN",
                },
            },
        ],
    ],
} as Action;

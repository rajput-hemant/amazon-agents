import { Plugin } from "@elizaos/core";
import { amazonOrderAction } from "./actions/order.ts";
import { amazonCheckoutAction } from "./actions/checkout.ts";
import { amazonLoginAction } from "./actions/login.ts";
import { AmazonProvider } from "./providers/amazonProvider.ts";
import { amazonEvaluator } from "./evaluators/amazonEvaluator.ts";

// Also export individual components
export * as actions from "./actions/index.ts";
export * as providers from "./providers/index.ts";
export * as evaluators from "./evaluators/index.ts";

export const amazonPlugin: Plugin = {
    name: "amazon",
    description: "Plugin for handling Amazon shopping interactions",
    actions: [amazonOrderAction, amazonCheckoutAction, amazonLoginAction],
    evaluators: [amazonEvaluator],
    providers: [AmazonProvider.getInstance()],
};

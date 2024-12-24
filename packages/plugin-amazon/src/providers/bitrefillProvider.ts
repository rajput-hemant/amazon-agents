import { IAgentRuntime, Memory, Provider } from "@elizaos/core";
import playwright from "playwright";

export class BitrefillProvider implements Provider {
    private browser: playwright.Browser | null = null;
    private context: playwright.BrowserContext | null = null;
    private page: playwright.Page | null = null;
    private runtime: IAgentRuntime | null = null;
    private static instance: BitrefillProvider | null = null;
    private readonly BITREFILL_URL =
        "https://www.bitrefill.com/us/en/gift-cards/amazon_com-usa/";

    private constructor() {
        // Private constructor for singleton pattern
    }

    static getInstance(): BitrefillProvider {
        if (!BitrefillProvider.instance) {
            BitrefillProvider.instance = new BitrefillProvider();
        }
        return BitrefillProvider.instance;
    }

    async get(_runtime: IAgentRuntime, _message: Memory): Promise<string> {
        return "Bitrefill provider ready for gift card purchases";
    }

    async init() {
        if (this.browser) {
            console.log(
                "Browser already initialized, reusing existing instance"
            );
            return;
        }

        console.log("Initializing browser for Bitrefill...");
        this.browser = await playwright.chromium.launch({
            headless: false,
            args: [
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--window-size=1280,800",
                "--start-maximized",
            ],
        });

        this.context = await this.browser.newContext({
            viewport: { width: 1280, height: 800 },
            userAgent:
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        });

        this.page = await this.context.newPage();
        await this.page.setViewportSize({ width: 1280, height: 800 });
    }

    private async delay(ms: number) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    async purchaseBitrefillGiftCard(amount: number): Promise<boolean> {
        try {
            if (!this.page) {
                await this.init();
            }

            console.log(`Navigating to Bitrefill for $${amount} gift card...`);
            // Navigate to Bitrefill Amazon gift card page
            await this.page!.goto(this.BITREFILL_URL, {
                waitUntil: "networkidle",
            });
            await this.delay(1000);

            // Accept cookies if the button exists
            console.log("Checking for cookie consent button...");
            try {
                const cookieSelector =
                    'button[type="submit"]:has-text("Accept all")';
                await this.page!.waitForSelector(cookieSelector, {
                    timeout: 5000,
                });
                await this.page!.click(cookieSelector);
                console.log("Accepted cookies");
                await this.delay(1000);
            } catch {
                console.log("No cookie consent button found, continuing...");
            }

            // Wait for and click the amount selector button
            const toggleButtonSelector = "#downshift-0-toggle-button";
            await this.page!.waitForSelector(toggleButtonSelector);
            await this.delay(1000);
            await this.page!.click(toggleButtonSelector);
            await this.delay(1000);

            // Wait for and select the specific amount
            const amountOptionSelector = `[role="option"]:has-text("$${amount}")`;
            await this.page!.waitForSelector(amountOptionSelector);
            await this.delay(1000);
            await this.page!.click(amountOptionSelector);
            await this.delay(1000);

            console.log("Selected amount, looking for add to cart button...");
            // Wait for and click the add to cart button
            const addToCartSelector = 'button:has-text("Add to cart")';
            await this.page!.waitForSelector(addToCartSelector);
            await this.delay(1000);
            await this.page!.click(addToCartSelector);
            await this.delay(1000);

            console.log("Added to cart, proceeding to checkout...");
            // Wait for and click the checkout button
            const checkoutSelector = 'a[data-cy="cart-widget-checkout-button"]';
            await this.page!.waitForSelector(checkoutSelector);
            await this.delay(1000);
            await this.page!.click(checkoutSelector);
            await this.delay(1000);

            console.log("Entering email...");
            // Wait for email input field and enter AMAZON_EMAIL
            const emailSelector = '#email[data-cy="email-input"]';
            await this.page!.waitForSelector(emailSelector);
            await this.delay(1000);
            const amazonEmail = process.env.AMAZON_EMAIL;
            if (!amazonEmail) {
                throw new Error("AMAZON_EMAIL environment variable is not set");
            }
            await this.page!.fill(emailSelector, amazonEmail);
            await this.delay(1000);

            // Click continue to payment button
            const continueButtonSelector =
                'button[data-cy="continue-to-payment-button"]';
            await this.page!.waitForSelector(continueButtonSelector);
            await this.delay(1000);
            await this.page!.click(continueButtonSelector);
            await this.delay(1000);

            // console.log("Selecting USDC payment method...");
            // // Use the data-cy attribute to find and click the USDC Solana button
            // const usdcSolanaSelector =
            //     'button[data-cy="payment-method-usdc_solana-button"]';
            // await this.page!.waitForSelector(usdcSolanaSelector, {
            //     timeout: 10000,
            // });
            // await this.delay(1000);
            // await this.page!.click(usdcSolanaSelector);
            // await this.delay(2000);

            // console.log("Waiting for payment processing...");
            // // Wait for payment processing screen
            // await this.page!.waitForSelector(".payment-processing", {
            //     timeout: 5000,
            // });

            return true;
        } catch (error) {
            console.error("Error during Bitrefill purchase:", error);
            return false;
        }
    }

    async isPageLoaded(): Promise<boolean> {
        try {
            await this.page!.waitForSelector("#downshift-0-toggle-button", {
                timeout: 5000,
            });
            return true;
        } catch {
            return false;
        }
    }

    async cleanup() {
        try {
            if (this.browser) {
                console.log("Cleaning up browser resources...");
                await this.browser.close();
                this.browser = null;
                this.context = null;
                this.page = null;
            }
        } catch (error) {
            console.error("Error cleaning up browser:", error);
        }
    }
}

// Export a function to get the singleton instance
export const getBitrefillProvider = (): BitrefillProvider => {
    return BitrefillProvider.getInstance();
};

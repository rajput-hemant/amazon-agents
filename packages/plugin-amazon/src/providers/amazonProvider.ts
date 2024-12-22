import { IAgentRuntime, Memory, Provider } from "@elizaos/core";
import playwright from "playwright";

export class AmazonProvider implements Provider {
    private browser: playwright.Browser | null = null;
    private context: playwright.BrowserContext | null = null;
    private page: playwright.Page | null = null;

    async get(runtime: IAgentRuntime, message: Memory): Promise<string> {
        const query = message.content.text;
        const products = await this.searchProduct(query);
        return JSON.stringify(products);
    }

    async init() {
        if (!this.browser) {
            console.log("Initializing browser for Amazon search...");
            this.browser = await playwright.chromium.launch({
                headless: true,
            });
            this.context = await this.browser.newContext();
            this.page = await this.context.newPage();
        }
    }

    async searchProduct(query: string) {
        try {
            if (!this.page) {
                await this.init();
            }

            console.log(`Searching Amazon for: ${query}`);
            await this.page!.goto("https://www.amazon.com");
            await this.page!.fill("#twotabsearchtextbox", query);
            await this.page!.click("#nav-search-submit-button");

            // Wait for search results
            await this.page!.waitForSelector(
                '[data-component-type="s-search-result"]'
            );

            // Extract product information
            const products = await this.page!.$$eval(
                '[data-component-type="s-search-result"]',
                (elements) =>
                    elements.slice(0, 5).map((el) => ({
                        title:
                            el.querySelector("h2")?.textContent?.trim() || "",
                        price:
                            el
                                .querySelector(".a-price-whole")
                                ?.textContent?.trim() || "",
                        rating:
                            el
                                .querySelector(".a-icon-star-small")
                                ?.textContent?.trim() || "",
                        link:
                            el.querySelector("h2 a")?.getAttribute("href") ||
                            "",
                    }))
            );

            console.log(`Found ${products.length} products`);
            return products;
        } catch (error) {
            console.error("Error searching Amazon:", error);
            throw error;
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

export const amazonProvider = new AmazonProvider();

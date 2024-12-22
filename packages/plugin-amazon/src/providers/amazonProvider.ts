/* eslint-disable @typescript-eslint/no-unused-vars */
import { IAgentRuntime, Memory, Provider } from "@elizaos/core";
import playwright from "playwright";

export class AmazonProvider implements Provider {
    private browser: playwright.Browser | null = null;
    private context: playwright.BrowserContext | null = null;
    private page: playwright.Page | null = null;
    private runtime: IAgentRuntime | null = null;
    private static instance: AmazonProvider | null = null;

    private constructor() {
        // No runtime needed in constructor
    }

    static getInstance(): AmazonProvider {
        if (!AmazonProvider.instance) {
            AmazonProvider.instance = new AmazonProvider();
        }
        return AmazonProvider.instance;
    }

    async get(runtime: IAgentRuntime, message: Memory): Promise<string> {
        this.runtime = runtime;
        const query = message.content.text;
        const products = await this.searchProduct(query);
        return JSON.stringify(products);
    }

    private async getCachedCookies(): Promise<any[] | null> {
        if (!this.runtime) return null;
        const cookies =
            await this.runtime.cacheManager.get<any[]>("amazon/cookies");
        if (cookies) {
            console.log(`Found ${cookies.length} cached cookies`);
        } else {
            console.log("No cached cookies found");
        }
        return cookies;
    }

    private async cacheCookies(cookies: any[]): Promise<void> {
        if (!this.runtime) return;
        console.log(`Caching ${cookies.length} cookies`);
        await this.runtime.cacheManager.set("amazon/cookies", cookies);
        console.log("Amazon cookies cached successfully");
    }

    private async setCookiesFromArray(cookies: any[]): Promise<void> {
        if (!this.context) {
            await this.init();
        }
        await this.context!.addCookies(cookies);
        console.log("Cookies loaded into browser context");
    }

    async init() {
        if (!this.browser) {
            console.log("Initializing browser for Amazon search...");
            this.browser = await playwright.chromium.launch({
                headless: true,
                args: ["--no-sandbox", "--disable-setuid-sandbox"],
            });
            this.context = await this.browser.newContext({
                userAgent:
                    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            });

            // Try to load cached cookies
            const cachedCookies = await this.getCachedCookies();
            if (cachedCookies) {
                await this.setCookiesFromArray(cachedCookies);
                console.log("Loaded cached cookies");
            }

            this.page = await this.context.newPage();
            await this.page.setViewportSize({ width: 1280, height: 800 });
        }
    }

    async login() {
        if (!this.page) {
            await this.init();
        }

        try {
            // Check if already logged in using cached cookies
            await this.page!.goto("https://www.amazon.com", { timeout: 10000 });
            const isLoggedIn = await this.page!.evaluate(() => {
                return (
                    document
                        .querySelector("#nav-link-accountList-nav-line-1")
                        ?.textContent?.includes("Hello, Sign in") === false
                );
            });

            if (isLoggedIn) {
                console.log("Already logged in via cookies");
                return true;
            }

            console.log("Logging into Amazon...");
            await this.page!.click("#nav-link-accountList");
            await this.page!.waitForSelector("#ap_email", { timeout: 5000 });
            await this.page!.fill("#ap_email", process.env.AMAZON_EMAIL || "");
            await this.page!.waitForTimeout(1000);
            await this.page!.click("#continue");
            await this.page!.waitForSelector("#ap_password", { timeout: 5000 });
            await this.page!.fill(
                "#ap_password",
                process.env.AMAZON_PASSWORD || ""
            );
            await this.page!.waitForTimeout(1000);
            await this.page!.click("#signInSubmit");

            // Wait for successful login
            await this.page!.waitForSelector(
                "#nav-link-accountList-nav-line-1",
                { timeout: 5000 }
            );

            // Cache cookies after successful login
            const cookies = await this.context!.cookies();
            await this.cacheCookies(cookies);

            console.log("Login completed and cookies cached");
            return true;
        } catch (error: unknown) {
            console.error("Login failed:", error);
            return false;
        }
    }

    async addToCart(productLink: string) {
        try {
            if (!this.page) {
                await this.init();
            }

            console.log("Adding product to cart...");
            // Navigate to product page with a timeout
            await this.page!.goto(`https://www.amazon.com${productLink}`, {
                timeout: 10000,
                waitUntil: "networkidle",
            });

            // Wait for and click add to cart button
            await this.page!.waitForSelector("#add-to-cart-button", {
                timeout: 5000,
            });
            await this.page!.click("#add-to-cart-button");

            // Wait for confirmation - try different selectors
            try {
                await Promise.race([
                    this.page!.waitForSelector("#nav-cart-count", {
                        state: "visible",
                        timeout: 5000,
                    }),
                    this.page!.waitForSelector(".a-size-medium-plus", {
                        state: "visible",
                        timeout: 5000,
                    }),
                    this.page!.waitForSelector(
                        "#NATC_SMART_WAGON_CONF_MSG_SUCCESS",
                        { state: "visible", timeout: 5000 }
                    ),
                ]);
            } catch (error) {
                console.log(
                    "Couldn't find standard confirmation, but continuing..."
                );
            }

            console.log("Product added to cart");
            return true;
        } catch (error) {
            console.error("Error adding to cart:", error);
            return false;
        }
    }

    async searchProduct(query: string) {
        try {
            if (!this.page) {
                await this.init();
            }

            // Try to login, but continue even if it fails
            await this.login();

            console.log(`Searching Amazon for: ${query}`);
            await this.page!.goto("https://www.amazon.com", {
                timeout: 10000,
                waitUntil: "load",
            });

            // Wait for and fill search box
            const searchBoxSelector = "#twotabsearchtextbox";
            await this.page!.waitForSelector(searchBoxSelector, {
                timeout: 5000,
            });

            // Clear the search box first
            await this.page!.fill(searchBoxSelector, "");
            await this.page!.waitForTimeout(500);
            await this.page!.fill(searchBoxSelector, query);
            await this.page!.waitForTimeout(500);

            // Click search and wait for results
            await this.page!.click("#nav-search-submit-button");

            // Wait for either search results or no results message
            await Promise.race([
                this.page!.waitForSelector(
                    '[data-component-type="s-search-result"]',
                    { timeout: 10000 }
                ),
                this.page!.waitForSelector(".s-no-results-result", {
                    timeout: 10000,
                }),
            ]);

            // Check if we got any results
            const noResults = await this.page!.$(".s-no-results-result");
            if (noResults) {
                console.log("No results found for query");
                return [];
            }

            // Take a small pause to let all results load
            await this.page!.waitForTimeout(2000);

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
                                ?.textContent?.trim() ||
                            el.querySelector(".a-price")?.textContent?.trim() ||
                            "",
                        rating:
                            el
                                .querySelector(".a-icon-star-small")
                                ?.textContent?.trim() ||
                            el
                                .querySelector(".a-icon-star")
                                ?.textContent?.trim() ||
                            "",
                        link:
                            el.querySelector("h2 a")?.getAttribute("href") ||
                            "",
                    }))
            );

            console.log(`Found ${products.length} products`);

            // Save cookies after successful search
            if (this.context) {
                const cookies = await this.context.cookies();
                console.log(
                    `Saving ${cookies.length} cookies after successful search`
                );
                await this.cacheCookies(cookies);
            }

            return products;
        } catch (error) {
            console.error("Error searching Amazon:", error);
            // Try to save a screenshot for debugging
            if (this.page) {
                try {
                    await this.page.screenshot({ path: "amazon-error.png" });
                    console.log("Saved error screenshot to amazon-error.png");
                } catch (e) {
                    console.error("Failed to save error screenshot:", e);
                }
            }
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

// Export a function to get the singleton instance
export const getAmazonProvider = (): AmazonProvider => {
    return AmazonProvider.getInstance();
};

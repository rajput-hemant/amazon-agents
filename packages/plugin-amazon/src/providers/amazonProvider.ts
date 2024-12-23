import { IAgentRuntime, Memory, Provider } from "@elizaos/core";
import playwright from "playwright";

export class AmazonProvider implements Provider {
    private browser: playwright.Browser | null = null;
    private context: playwright.BrowserContext | null = null;
    private page: playwright.Page | null = null;
    private runtime: IAgentRuntime | null = null;
    private static instance: AmazonProvider | null = null;
    private static browserInitializing: boolean = false;

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
        if (this.browser) {
            console.log(
                "Browser already initialized, reusing existing instance"
            );
            return;
        }

        console.log("Initializing browser for Amazon search...");
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

        // Try to load cached cookies
        const cachedCookies = await this.getCachedCookies();
        if (cachedCookies) {
            await this.setCookiesFromArray(cachedCookies);
            console.log("Loaded cached cookies");
        }

        this.page = await this.context.newPage();
        await this.page.setViewportSize({ width: 1280, height: 800 });
    }

    async login() {
        if (!this.page) {
            await this.init();
        }

        try {
            console.log("Attempting to login to Amazon...");
            await this.page!.goto("https://www.amazon.com", { timeout: 10000 });

            // Take screenshot before login attempt
            await this.page!.screenshot({ path: "amazon-before-login.png" });
            console.log(
                "Saved pre-login screenshot to amazon-before-login.png"
            );

            // Check if already logged in
            const accountName = await this.page!.textContent(
                "#nav-link-accountList-nav-line-1"
            );
            if (accountName && !accountName.includes("Hello, sign in")) {
                console.log("Already logged in as:", accountName);
                await this.page!.screenshot({
                    path: "amazon-already-logged-in.png",
                });
                return true;
            }

            console.log("Not logged in, proceeding with login...");
            await this.page!.click("#nav-link-accountList");

            // Wait for and fill email
            await this.page!.waitForSelector("#ap_email", { timeout: 5000 });
            await this.page!.fill("#ap_email", process.env.AMAZON_EMAIL || "");
            await this.page!.screenshot({ path: "amazon-email-filled.png" });
            await this.page!.click("#continue");

            // Wait for and fill password
            await this.page!.waitForSelector("#ap_password", { timeout: 5000 });
            await this.page!.fill(
                "#ap_password",
                process.env.AMAZON_PASSWORD || ""
            );
            await this.page!.screenshot({ path: "amazon-password-filled.png" });
            await this.page!.click("#signInSubmit");

            // Wait for successful login and verify
            await this.page!.waitForTimeout(3000); // Give extra time for login
            const postLoginAccountName = await this.page!.textContent(
                "#nav-link-accountList-nav-line-1"
            );
            if (
                postLoginAccountName &&
                !postLoginAccountName.includes("Hello, sign in")
            ) {
                console.log("Successfully logged in as:", postLoginAccountName);
                await this.page!.screenshot({
                    path: "amazon-login-success.png",
                });

                // Cache cookies after successful login
                const cookies = await this.context!.cookies();
                await this.cacheCookies(cookies);

                return true;
            } else {
                console.log("Login might have failed, account name not found");
                await this.page!.screenshot({
                    path: "amazon-login-failure.png",
                });
                return false;
            }
        } catch (error) {
            console.error("Login failed:", error);
            await this.page!.screenshot({ path: "amazon-login-error.png" });
            return false;
        }
    }

    async addToCart(productLink: string) {
        try {
            if (!this.page) {
                await this.init();
            }

            console.log("Adding product to cart...");
            console.log("Product link:", productLink);

            // Navigate to product page
            const productUrl = `https://www.amazon.com${productLink}`;
            console.log("Navigating to:", productUrl);

            await this.page!.goto(productUrl, {
                timeout: 30000,
                waitUntil: "domcontentloaded",
            });

            // Wait for the add to cart button
            const addToCartButton = await this.page!.waitForSelector(
                "#add-to-cart-button",
                { timeout: 10000 }
            );
            if (!addToCartButton) {
                console.error("Add to cart button not found");
                return false;
            }

            // Click the button
            await addToCartButton.click();
            console.log("Clicked add to cart button");

            // Wait for success confirmation
            await this.page!.waitForTimeout(2000);

            // Check for success
            const isSuccess = await this.page!.waitForSelector(
                "#nav-cart-count",
                { timeout: 5000 }
            )
                .then(() => true)
                .catch(() => false);

            if (isSuccess) {
                console.log("Successfully added to cart");
                return true;
            }

            console.error("Could not confirm item was added to cart");
            return false;
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

            // Try to login only if not already logged in
            const isLoggedIn = await this.isLoggedIn();
            if (!isLoggedIn) {
                console.log("Not logged in, attempting login...");
                const loginSuccess = await this.login();
                if (!loginSuccess) {
                    throw new Error("Failed to login to Amazon");
                }
            }

            console.log(`Searching Amazon for: ${query}`);
            await this.page!.goto("https://www.amazon.com", {
                timeout: 10000,
                waitUntil: "load",
            });

            // Wait for and fill search box
            const searchBoxSelector = "#twotabsearchtextbox";
            await this.page!.waitForSelector(searchBoxSelector);
            await this.page!.fill(searchBoxSelector, "");
            await this.page!.fill(searchBoxSelector, query);
            await this.page!.click("#nav-search-submit-button");

            console.log("Waiting for search results...");

            // Wait for results to load
            await this.page!.waitForSelector(
                'div[data-component-type="s-search-result"]',
                { timeout: 10000 }
            );
            console.log("Search results loaded");

            // Take a small pause to let all results load
            await this.page!.waitForTimeout(2000);

            // Get product details using the correct selectors
            const firstProduct = await this.page!.evaluate(() => {
                // Find all product results
                const products = document.querySelectorAll(
                    'div[data-component-type="s-search-result"]'
                );
                if (!products.length) return null;

                // Get the first product
                const product = products[0];

                // Find the title link (a tag inside h2)
                const titleLink = product.querySelector(
                    "a.a-link-normal.s-underline-text.s-underline-link-text.s-link-style.a-text-normal"
                );
                if (!titleLink) return null;

                // Get the href and title
                const link = titleLink.getAttribute("href");
                const title = titleLink.textContent?.trim();

                // Get the price
                const priceElement = product.querySelector(
                    ".a-price .a-offscreen"
                );
                const price = priceElement
                    ? priceElement.textContent?.trim()
                    : "";

                console.log("Found product:", { title, link, price });
                return { title, link, price };
            });

            if (!firstProduct || !firstProduct.link) {
                console.log("No valid product found");
                return [];
            }

            console.log("Successfully extracted product:", firstProduct);
            return [firstProduct];
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

    private async isLoggedIn(): Promise<boolean> {
        if (!this.page) return false;

        try {
            const accountName = await this.page.textContent(
                "#nav-link-accountList-nav-line-1"
            );
            return !!(accountName && !accountName.includes("Hello, sign in"));
        } catch (error) {
            console.error("Error checking login status:", error);
            return false;
        }
    }
}

// Export a function to get the singleton instance
export const getAmazonProvider = (): AmazonProvider => {
    return AmazonProvider.getInstance();
};

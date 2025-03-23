import { targetURLtoID, delay, colorizeStatus, getRandomUserAgent } from "../../utils/utils";
import { product } from "../../types";
import { autoBuyTarget } from "./targetScraper";
import { updateCookies } from "./refreshCookies";
import { writeLog } from "../../utils/utils";
import ora from "ora"

const autoBuy = async (product: product, configData: any, logPath: string, coolDowns: Map<string, number>, cookiePath?: any) => {
    if(cookiePath && cookiePath.length > 0) {
        console.log("cookies found");
        await autoBuyTarget(product, configData.credentials.target, coolDowns, logPath, cookiePath);
    } else {
        await autoBuyTarget(product, configData.credentials.target, coolDowns, logPath);
    }
}

const checkProduct = async(url: string, coolDowns: Map<string, number>, logPath: string): Promise<string> => {
    const productID: string = targetURLtoID(url);

    // Check if the product is on cooldown
    const now = Date.now();
    if (coolDowns.has(url)) {
        const lastAttemptTime = coolDowns.get(url)!;
        const timeSinceLastAttempt = now - lastAttemptTime;

        if (timeSinceLastAttempt < 3 * 60 * 1000) { // 3 minutes
            writeLog(logPath, `Skipping ${productID}, still in cooldown for ${(180 - timeSinceLastAttempt / 1000).toFixed(1)} seconds.`);
            return "ON_COOLDOWN"; // Ignore this product
        } else {
            coolDowns.delete(url); // Cooldown expired, remove it
            writeLog(logPath, `Cooldown expired for ${productID}, retrying.`);
        }
    }

    

    const APIUrl: string = `https://redsky.target.com/redsky_aggregations/v1/web/product_fulfillment_v1?key=9f36aeafbe60771e321a7cc95a78140772ab3e96&is_bot=false&tcin=${productID}`
    try {
        const response = await fetch(APIUrl, {
            method: "GET",
            headers: {
                "User-Agent": getRandomUserAgent(),
                "Accept": "*/*",
                "Accept-Encoding": "gzip, deflate, br",
                "Connection": "keep-alive",
            }
        });
        if(!response.ok) {
            throw new Error("Response Status: " + response.status);
        }

        const json = await response.json(); 
        return json.data.product.fulfillment.shipping_options.availability_status;
    } catch (error) {
        console.error("Error fetching product data:", error);
        return "ERROR";
    }
}

export const checkAllProducts = async(configData: any, logPath: string, cookiePath?: string) => {
    const coolDowns: Map<string, number> = new Map();
    let refreshCounter: number = 0;
    const products = configData.products;

    const spinner = ora('Starting product check...').start();

    while(true) {
        const now = Date.now();
        if((refreshCounter == 1800 || refreshCounter == 0) && cookiePath.length > 0) {
            try{
                await updateCookies(cookiePath, configData.credentials.target, logPath);
                refreshCounter = 1;
            } catch(err) {
                writeLog(logPath, "Error updating cookies: " + err);
                refreshCounter = 1;
            }
            
        }
        let productRequests: Promise<string>[] = []
        for(const product of products) {
            productRequests.push(checkProduct(product.productURL, coolDowns, logPath));
        }
        const results = await Promise.all(productRequests);

        for(let i = 0; i < results.length; i++) {

            if(results[i] == "IN_STOCK" || results[i] == "PRE_ORDER_SELLABLE") {
                try{
                    await autoBuy(products[i], configData, logPath, coolDowns, cookiePath);
                } catch (err) {
                    console.error("Error during auto-buy process:", err);
                } finally {
                    continue;
                }
            }
        }

        const tableData = products.map((product, index) => {
            return {
                product: product.name || product.productURL,
                status: results[index]
            }
        });

        console.table(tableData);
        spinner.succeed("Cycle complete. Waiting 500ms before next check...");
        spinner.start("Checking again...");
        await delay(500);
        refreshCounter++;
    }

}
import { exec } from "child_process";
import { billingInfo, credentials, product } from "../types";
import fs from "fs"
import path from "path";
import chalk from "chalk";

export const generateConfig = (configPath: string) => {
    let configTemplate: any = {};
    const billingTemplate: billingInfo = {
        cardNumber: "",
        expiryMonth: "",
        expiryYear: "",
        cardCVV: "",
        firstName: "",
        lastName: ""
    }

    const productsTemplate: product[] = [
        {
            productURL: "",
        }
    ]

    const credentialsTemplate: any = {
        target: {
            email: "",
            password: "",
        }
    } 

    //configTemplate.billingInfo = billingTemplate;
    configTemplate.products = productsTemplate;
    configTemplate.credentials = credentialsTemplate;

    const jsonString = JSON.stringify(configTemplate, null, 2);
    try {
        fs.writeFileSync(configPath, jsonString, 'utf8');
        console.log(`Config file generated at ${configPath}. Please fill the fields and restart the application`)
    } catch (err) {
        console.error("failed to generate config file", err);
    }
    
}

export const targetURLtoID = (url: string): string => {
    const match = url.match(/(\d+)$/);
    if(!match) { throw new Error("Failed to get productID number. Ensure that the Product URL is formatted properly!")}
    const productIDNum: string = match[0];

    return productIDNum
}

export async function delay(time) {
    return new Promise(function(resolve) { 
        setTimeout(resolve, time)
    });
}

export async function randomDelay(min: number, max: number) {
    const delayTime = Math.floor(Math.random() * (max - min + 1)) + min;
    await delay(delayTime);
}

export const getRandomUserAgent = (): string => {
    const userAgentPath = path.join(__dirname, "./useragents.json");
    const userAgentData = fs.readFileSync(userAgentPath, 'utf8');
    const jsonUserAgentData = JSON.parse(userAgentData);

    const randomObj = jsonUserAgentData[Math.floor(Math.random() * jsonUserAgentData.length)];
    return randomObj.useragent
}

export const colorizeStatus = (status: string): string => {
    switch (status.toLowerCase()) {
        case "in_stock":
        case "available":
            return chalk.green(status); // Green for available products
        case "out_of_stock":
        case "unavailable":
        case "PRE_ORDER_UNSELLABLE":
            return chalk.red(status); // Red for out-of-stock products
        case "limited_stock":
        case "low_stock":
            return chalk.yellow(status); // Yellow for limited stock
        case "preorder":
            return chalk.blue(status); // Blue for pre-orders
        default:
            return chalk.gray(status); // Gray for unknown statuses
    }
};

export function writeLog(logFolderPath: string, message: string): void {
    try {
        // Ensure directory exists
        const logFileDir = path.join(logFolderPath, 'debug.log');
        const dir = path.dirname(logFileDir);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        const timestamp = new Date().toLocaleString();

        // Format log entry with timestamp
        const logEntry = `[${timestamp}] ${message}\n`;

        // Append log entry to file
        fs.appendFileSync(logFileDir, logEntry, 'utf8');
    } catch (error) {
        console.error('Error writing log:', error);
    }
}

export const openInDefaultBrowser = (url: string) => {
    const platform = process.platform;
    if (platform === "darwin") {
        exec(`open "${url}"`); // macOS
    } else if (platform === "win32") {
        exec(`start "" "${url}"`); // Windows
    } else {
        exec(`xdg-open "${url}"`); // Linux
    }
};
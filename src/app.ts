import fs from "fs"
import path from "path"
import { billingInfo, product, credentials } from "./types";
import { generateConfig, targetURLtoID } from "./utils/utils";
import { autoBuyTarget } from "./scrapers/target/targetScraper";
import { url } from "inspector";
import { checkAllProducts } from "./scrapers/target/checkProducts";
import { json } from "stream/consumers";
import { updateCookies } from "./scrapers/target/refreshCookies";

const configPath = path.join(__dirname, "../config.json");
const cookiePath = path.join(__dirname, "../cookies.json");
const logPath = path.join(__dirname, "../logs");

//generate config file if it dosen't exist. exit after generating config file
if(!fs.existsSync(configPath)) {
    generateConfig(configPath);
    process.exit(0);
}

//if the cookies json dosen't exist, create an empty one.
if(!fs.existsSync(cookiePath)) {
    const defaultCookies = [];
    fs.writeFileSync(cookiePath, JSON.stringify(defaultCookies, null, 2));
}

const configData = fs.readFileSync(configPath, 'utf8');
const jsonConfigData = JSON.parse(configData);

checkAllProducts(jsonConfigData, logPath, cookiePath);








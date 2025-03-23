import puppeteer from "puppeteer"
import { Path } from "typescript";
import { delay, getRandomUserAgent, writeLog } from "../../utils/utils";
import { credentials } from "../../types";

export const updateCookies = async (cookiePath: string, credentials: credentials, logPath: string) => {
    const browser = await puppeteer.launch({headless: true});
    
    try{
        writeLog(logPath, "Updating cookies...");
        
        
    
        const page = await browser.newPage();


        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36');

        writeLog(logPath, "User agent for getting cookies: " + await page.browser().userAgent());
        await page.goto("https://www.target.com/p/pok-233-mon-pikachu-train-and-play-deluxe-interactive-action-figure/-/A-87846757");
        
        
        //navigate to sign-in
        await page.locator("#account-sign-in").click();
        writeLog(logPath, "Opened Sign-in menu");
        const signInBtn = await page.waitForSelector('.styles_ndsBaseButton__W8Gl7.styles_md__X_r95.styles_mdGap__9J0yq.styles_fullWidth__3XX6f.styles_ndsButtonPrimary__tqtKH.h-margin-t-x2.h-margin-b-default');
        writeLog(logPath, "Found sign-in button");
        await delay(2000);
        await signInBtn.click();
        writeLog(logPath, "Navigated to sign-in page");
    
        await delay(2000);
        
        //"keep me signed in" toggle
       await page.locator("#keepMeSignedIn").click();

        //enter account information
        await page.locator("#username").fill(credentials.email);
        await page.locator("#password").fill(credentials.password);
        writeLog(logPath, "Filled in account information");
    
        //login
        await page.locator("#login").click();
        writeLog(logPath, "Clicked login");
    
        //skip mobile number popup if it appears
        try{
            await page.waitForSelector(".styles_ndsLink__GUaai.styles_onLight__QKcK7.styles_alwaysDecorate__x_UC1", {timeout: 2000});
            await page.locator(".styles_ndsLink__GUaai.styles_onLight__QKcK7.styles_alwaysDecorate__x_UC1").click();
            console.log("mobile number pop-up detected");
        } catch (err) {
            console.log("Did not find mobile pop-up... proceeding");
        }
    
        //skip passkey popup if it appears
        try {
            await page.waitForSelector(".styles_ndsBaseButton__W8Gl7.styles_md__X_r95.styles_mdGap__9J0yq.styles_fullWidth__3XX6f.styles_ndsButtonSecondary__iSf2I", {timeout: 2000});
            await page.locator(".styles_ndsBaseButton__W8Gl7.styles_md__X_r95.styles_mdGap__9J0yq.styles_fullWidth__3XX6f.styles_ndsButtonSecondary__iSf2I").click();
            console.log("passkey pop-up detected");
        } catch (err) {
            console.log("Did not find passkey pop-up, proceeding...")
        }
    
        await delay(5000);
    
        const cookies = await browser.cookies();
        //write these array of cookies to json file stored at cookiePath
        const cookieJSON = JSON.stringify(cookies);
        const fs = require("fs");
        fs.writeFileSync(cookiePath, cookieJSON);
        console.log("Cookies updated");
        writeLog(logPath, "Cookies saved to cookiePath");
    
        
    
        await browser.close();
    
    } catch (err) {
        writeLog(logPath, "Error updating cookies: " + err);
        browser.close();
        throw err
    }
}
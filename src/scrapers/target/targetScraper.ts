import { billingInfo, credentials, product } from "../../types"
import { targetURLtoID, delay, writeLog, openInDefaultBrowser, getRandomUserAgent, randomDelay } from "../../utils/utils";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import fs from "fs";
import { log } from "console";

export const autoBuyTarget = async (product: product, credentials: credentials, coolDowns: Map<string, number>, logPath: string, cookiePath?: any) => {
    writeLog(logPath, "Starting Target Auto-Buy for " + product.productURL);

    puppeteer.use(StealthPlugin());

    const browser = await puppeteer.launch({
        headless: false,
    });
    try{
        let cookies;
        const MAX_TRIES: number = 10;
        const MAX_CART_TRIES: number = 15;
        const MAX_PLACEORDER_TRIES: number = 300;
        let addedToCart: boolean = false;
     
        
    
        if(cookiePath && cookiePath.length > 0) {
            const cookieFile = fs.readFileSync(cookiePath, 'utf8');
            cookies = JSON.parse(cookieFile);
            cookies.forEach(async (cookie) => { 
                await browser.setCookie(cookie);
            });
        }

        const page = await browser.newPage();

        writeLog(logPath, "Scraper User Agent: " + browser.userAgent);

        await page.goto(product.productURL);
        writeLog(logPath, "Navigated to: " + product.productURL);

        await page.mouse.move(100, 100); // Simulate real user activity

        page.on('response', async (response) => {
            if (
                response.url().includes('https://carts.target.com/web_checkouts/v1/cart_items?field_groups=CART%2CCART_ITEMS%2CSUMMARY&key=9f36aeafbe60771e321a7cc95a78140772ab3e96') ||
                response.url().includes('https://carts.target.com/web_checkouts/v1/checkout?cart_type=REGULAR&field_groups=ADDRESSES%2CCART%2CCART_ITEMS%2CPAYMENT_INSTRUCTIONS%2CPICKUP_INSTRUCTIONS%2CPROMOTION_CODES%2CSUMMARY&key=e59ce3b531b2c39afb2e2b8a71ff10113aac2a14')
              ) {
                console.log(`Intercepted Response: ${response.url()}`);
                writeLog(logPath, `Intercepted Response: ${response.url()}`);
              
                try {
                  writeLog(logPath, "response status: " + response.status());
                  writeLog(logPath, "request Type" + response.request().resourceType());
                  const responseBody = await response.json();
              
                  console.log("Response Body:", responseBody);
                  writeLog(logPath, "RESPONSE BODY" + JSON.stringify(responseBody, null, 2));
                  writeLog(logPath, "RESPONSE HEADERS: " + JSON.stringify(response.headers(), null, 2));
                  writeLog(logPath, "REQUEST HEADERS" + JSON.stringify(response.request().headers(), null, 2));
              
                  if (responseBody.alerts && responseBody.alerts.length > 0) {
                    for (const alert of responseBody.alerts) {
                      if (
                        alert.message === "inventory is not available for this item" ||
                        alert.code === "INVENTORY_NOT_AVAILABLE" || 
                        alert.action === "ITEM_MOVED_TO_SFL"
                      ) {
                        cartAttemptCounter = MAX_CART_TRIES
                        placeOrderAttemptCounter = MAX_PLACEORDER_TRIES;
                        coolDowns.set(product.productURL, Date.now());
                        writeLog(logPath, "Item is out of stock or moved to Save For Later due to no inventory.");
                      }
                    }
                  }
              
                  if (responseBody && responseBody.cart_id) {
                    writeLog(logPath, "Cart ID: " + responseBody.cart_id);
                    addedToCart = true;
                  }
              
                  if (responseBody && responseBody.orders?.cart_state === "COMPLETED") {
                    writeLog(logPath, "🎊 SUCCESFULLY PURCHASED A PRODUCT! 🎊");
              
                    // Break out of the place order loop
                    placeOrderAttemptCounter = MAX_PLACEORDER_TRIES;
                  }
                } catch (err) {
                  writeLog(logPath, "error reading response: " + err);
                  console.error("Error reading response:", err);
                }
              }
        });
    
    
        const signIn = await page.waitForSelector("#account-sign-in");
        const signInText = (await signIn.getProperty("ariaLabel")).toString();
        
        let signedIn: boolean = false;
        signedIn = !signInText.includes("sign in");
    
        console.log("Currently signed in: ", signedIn);
        writeLog(logPath, `Currently signed in: ${signedIn}`);
    
        await page.setViewport({width: 1080, height: 1024});
    
        if(!cookies || !signedIn) {
            //navigate to sign-in
            writeLog(logPath, "Navigating to sign-in?");
            await page.locator("#account-sign-in").click();
            await page.locator('.styles_ndsBaseButton__W8Gl7.styles_md__X_r95.styles_mdGap__9J0yq.styles_fullWidth__3XX6f.styles_ndsButtonPrimary__tqtKH.h-margin-t-x2.h-margin-b-default').click();
    
            await delay(1000);
    
            //check if clicking the sign in signed us in
            let oneClickSignIn: boolean = false;
            try{
                const signIn = await page.waitForSelector("#account-sign-in");
                const signInText = (await signIn.getProperty("ariaLabel")).toString();
                oneClickSignIn = !signInText.includes("sign in") && signInText.length > 0;
            } catch (err) {
                console.log("Welp, didnt instant sign in :(");
                writeLog(logPath, "Couldn't instant sign in");
            }
    
            console.log(oneClickSignIn);
            writeLog(logPath, "One-click sign in: " + oneClickSignIn);
    
            //if we didnt get one-click signed in
            if(!oneClickSignIn) {
                //enter account information
                if(!signedIn && !cookies && !(cookies.length > 0)) {
                    await page.locator("#username").fill(credentials.email);
                }
                await page.locator("#password").fill(credentials.password);
    
                //login
                await page.locator("#login").click();
    
                //skip mobile number popup if it appears
                try{
                    const skip = await page.locator(".styles_ndsLink__GUaai.styles_onLight__QKcK7.styles_alwaysDecorate__x_UC1");
                    console.log("mobile number pop-up detected");
                    //skip.click();
                } catch (err) {
                    console.log("Did not find mobile pop-up... proceeding");
                }
    
                //skip passkey popup if it appears
                try {
                    const skip = await page.locator(".styles_ndsBaseButton__W8Gl7.styles_md__X_r95.styles_mdGap__9J0yq.styles_fullWidth__3XX6f.styles_ndsButtonSecondary__iSf2I");
                    console.log("passkey pop-up detected");
                    //skip.click();
                } catch (err) {
                    console.log("Did not find passkey pop-up, proceeding...")
                }
            }
            
    
        }
    
    
    
    
        //get productID number
        const productIDNum = targetURLtoID(product.productURL);
        
        //tries MAX_TRIES times to get valid button
        let attemptCounter: number = 0;
        while(attemptCounter < MAX_TRIES) {
            attemptCounter++;
            try {
                writeLog(logPath, "productNum" + productIDNum);
                await page.waitForSelector(`#addToCartButtonOrTextIdFor${productIDNum}`);
                const addToCartBtnBefore = await page.locator(`#addToCartButtonOrTextIdFor${productIDNum}`).waitHandle();
                const isDisabledBefore = await addToCartBtnBefore.evaluate(el => el.hasAttribute("disabled"));

                if(isDisabledBefore || isDisabledBefore == null) {
                    await delay(Math.floor(Math.random() * 2000) + 1000);
                    console.log("BUTTON DISABLED Refreshing...");
                    writeLog(logPath, "BUTTON DISABLED Refreshing...");
                    await page.reload();
                    continue;
                }
                
                //set product to shipping, if its a preorder skip this step
                if(!product.isPreorder){
                    //await page.locator('button.styles_ndsBaseButton__W8Gl7.styles_md__X_r95.styles_mdGap__9J0yq.styles_ndsButtonSecondary__iSf2I.sc-aa1812df-0.blGVoh[data-test="fulfillment-cell-shipping"]').click();
                }
                
    
                const addToCartBtn = await page.locator(`#addToCartButtonOrTextIdFor${productIDNum}`).waitHandle();
                const isDisabled = await addToCartBtn.evaluate(el => el.hasAttribute("disabled"));

                writeLog(logPath, `disabled: ${isDisabled}`);
    
                //if disabled, run again
                if(isDisabled) {
                    await delay(2000);
                    console.log("Refreshing...");
                    writeLog(logPath, "Refreshing...");
                    await page.reload();
                    continue;
                } else {
                    break;
                }
            } catch (error) {
                console.log("Error: " + error);
                writeLog(logPath, "Error: " + error);
                await page.reload();
            }
    
        }
    
        if(attemptCounter >= MAX_TRIES) {
            const timestamp = new Date().toLocaleString('en-US', {
                timeZone: 'America/New_York',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            }).replace(/[:\s,]/g, '-').replace(/\/+/g, '-');
            
            if(browser) {
                await page.screenshot({ path: `${logPath}/screenshot-${timestamp}.png` });
                browser.close();
            }
            throw new Error("Max tries reached, exiting...");
        }
    
        let cartAttemptCounter: number = 0;
        while(!addedToCart && cartAttemptCounter < MAX_CART_TRIES) {
            try{
                await page.waitForSelector(`#addToCartButtonOrTextIdFor${productIDNum}`, {timeout: 1000});
                await page.locator(`#addToCartButtonOrTextIdFor${productIDNum}`).click();
                await page.waitForSelector('button[aria-label="close"]', {timeout: 500});
                await page.locator('button[aria-label="close"]').setTimeout(500).click();
            } catch (err) {
                writeLog(logPath, "Error adding to cart: " + err);
            }
            //wait 200-500ms between clicks
            await randomDelay(200, 500);
            cartAttemptCounter++;
        }

        if(cartAttemptCounter >= MAX_CART_TRIES) {
            const timestamp = new Date().toLocaleString('en-US', {
                timeZone: 'America/New_York',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            }).replace(/[:\s,]/g, '-').replace(/\/+/g, '-');
            
            if(browser) {
                await page.screenshot({ path: `${logPath}/screenshot-${timestamp}.png` });
                browser.close();
            }
            coolDowns.set(product.productURL, Date.now());
            throw new Error("Max cart tries reached, exiting...");
        }
    


        await delay(300);
        page.goto("https://www.target.com/checkout");
        writeLog(logPath, "Went to checkout");
    

        try{
            await page.waitForSelector('button[data-test="save_and_continue_button_step_SHIPPING"]', {timeout: 2000});
            await page.locator('button[data-test="save_and_continue_button_step_SHIPPING"]').click();
        } catch(err) {
            writeLog(logPath, "Didn't find the Save and Continue button: " + err);
        }
    
        console.log("READY TO PLACE ORDER!");
        writeLog(logPath, "Ready to place order!");

    
        await delay(200);
        
        let placeOrderAttemptCounter: number = 0;
        while(placeOrderAttemptCounter < MAX_PLACEORDER_TRIES) {
            try{
                await page.waitForSelector('button.styles_ndsBaseButton__W8Gl7.styles_md__X_r95.styles_mdGap__9J0yq.styles_fullWidth__3XX6f.styles_ndsButton__XOOOH.styles_md__Yc3tr.styles_filleddefault__7QnWt[data-test="placeOrderButton"]', {
                    timeout: 500,
                });
                await page.locator('button.styles_ndsBaseButton__W8Gl7.styles_md__X_r95.styles_mdGap__9J0yq.styles_fullWidth__3XX6f.styles_ndsButton__XOOOH.styles_md__Yc3tr.styles_filleddefault__7QnWt[data-test="placeOrderButton"]').click();
            } catch (err) {
                writeLog(logPath, "Error placing order: " + err);
            }
            await delay(50);
            placeOrderAttemptCounter++;
        }

        writeLog(logPath, 'Broke out of place order loop')

        const timestamp = new Date().toLocaleString('en-US', {
            timeZone: 'America/New_York',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        }).replace(/[:\s,]/g, '-').replace(/\/+/g, '-');
        
        if(browser) {
            await page.screenshot({ path: `${logPath}/screenshot-${timestamp}.png` });
            browser.close();
        }
        
    } catch (err) {
        writeLog(logPath, err);
        const timestamp = new Date().toLocaleString('en-US', {
            timeZone: 'America/New_York',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        }).replace(/[:\s,]/g, '-').replace(/\/+/g, '-');
        
        if(browser) {
            await browser.close();
        }
        
        throw err;
    }


    
}
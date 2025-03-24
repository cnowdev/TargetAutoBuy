
# TargetAutoBuy 🎯

TargetAutoBuy is a Node.js TypeScript application that watches Target product URLs until they become available. It then attempts to purchase the product as soon as it becomes available using Puppeteer.


## Requirements
- Node.js
- npm
## Run Locally

Clone the project

```bash
  git clone https://github.com/cnowdev/TargetAutoBuy
```

Go to the project directory

```bash
  cd TargetAutoBuy
```

Install dependencies

```bash
  npm install
```

Run the dev script

```bash
  npm run dev
```

The dev script will generate a `config.json` file in your root directory that looks like this:
```json
{
  "products": [
    {
      "productURL": ""
    }
  ],
  "credentials": {
    "target": {
      "email": "",
      "password": ""
    }
  }
}
```
add to the products list using the format provided. **Note**: Ensure that the product URLs end with the product ID (the numbers) and nothing after that. For example, the URL should look something like:

```
https://www.target.com/p/product-name/-/A-12345678
```

OR

```
https://www.target.com/p/-/A-12345678
```


After specifying your credentials and a list of products, run the dev script again using `npm run dev`. It will begin scanning the products you provided, and attempt to buy the product when it becomes available.


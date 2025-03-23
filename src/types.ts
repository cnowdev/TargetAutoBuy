export interface billingInfo {
    cardNumber: string,
    expiryMonth: string,
    expiryYear: string,
    cardCVV: string,
    firstName: string,
    lastName: string
}

export interface product {
    vendor?: string,
    productURL: string,
    name?: string,
    isPreorder?: boolean,
}

export interface credentials {
    email: string,
    password: string
}
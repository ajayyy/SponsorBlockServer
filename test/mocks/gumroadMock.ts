export const licenseSuccess = {
    success: true,
    uses: 4,
    purchase: {}
};

export const licenseFail = {
    success: false,
    message: "That license does not exist for the provided product."
};


const subCode = (length = 8) => {
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "";
    for (let i = 0; i < length; i++) {
        result += characters[(Math.floor(Math.random() * characters.length))];
    }
    return result;
};

export const generateLicense = (): string => `${subCode()}-${subCode()}-${subCode()}-${subCode()}`;

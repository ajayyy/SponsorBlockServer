module.exports = {
    env: {
        browser: false,
        es2021: true,
        node: true,
    },
    extends: [
        "eslint:recommended",
        "plugin:@typescript-eslint/recommended",
    ],
    parser: "@typescript-eslint/parser",
    parserOptions: {
        ecmaVersion: 12,
        sourceType: "module",
    },
    plugins: ["@typescript-eslint"],
    rules: {
        // TODO: Remove warn rules when not needed anymore
        "no-self-assign": "off",
        "semi": "warn",
        "@typescript-eslint/no-empty-interface": "off",
        "@typescript-eslint/no-explicit-any": "off",
        "no-trailing-spaces": "warn",
        "prefer-template": "warn",
        "quotes": ["warn", "double", { "avoidEscape": true, "allowTemplateLiterals": true }],
        "no-multiple-empty-lines": ["error", { max: 2, maxEOF: 0 }],
        "indent": ["warn", 4, { "SwitchCase": 1 }],
        "object-curly-spacing": ["warn", "always"],
        "require-await": "warn",
    },
};

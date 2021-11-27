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
        "@typescript-eslint/no-empty-interface": "off",
        "@typescript-eslint/no-explicit-any": "off",
        "indent": ["warn", 4, { "SwitchCase": 1 }],
        "no-multiple-empty-lines": ["error", { max: 2, maxEOF: 0 }],
        "no-self-assign": "off",
        "no-trailing-spaces": "warn",
        "object-curly-spacing": ["warn", "always"],
        "prefer-template": "warn",
        "quotes": ["warn", "double", { "avoidEscape": true, "allowTemplateLiterals": true }],
        "require-await": "warn",
        "semi": "warn",
        "no-console": "warn"
    },
};

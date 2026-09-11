import { defineConfig } from"eslint/config";

import globals from "globals";
import tsParser from "@typescript-eslint/parser";
import typescriptEslint from "@typescript-eslint/eslint-plugin";
import js from "@eslint/js";

import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all
});

module.exports = defineConfig([{
    languageOptions: {
        globals: {
            ...Object.fromEntries(Object.entries(globals.browser).map(([key]) => [key, "off"])),
            ...globals.node,
        },

        parser: tsParser,
        ecmaVersion: 12,
        sourceType: "module",
        parserOptions: {},
    },

    extends: compat.extends("eslint:recommended", "plugin:@typescript-eslint/recommended"),

    plugins: {
        "@typescript-eslint": typescriptEslint,
    },

    rules: {
        // TODO: Remove warn rules when not needed anymore
        "@typescript-eslint/no-empty-interface": "off",
        "@typescript-eslint/no-explicit-any": "off",

        "indent": ["warn", 4, {
            "SwitchCase": 1,
        }],

        "no-multiple-empty-lines": ["error", {
            max: 2,
            maxEOF: 0,
        }],

        "no-self-assign": "off",
        "no-trailing-spaces": "warn",
        "object-curly-spacing": ["warn", "always"],
        "prefer-template": "warn",

        "quotes": ["warn", "double", {
            "avoidEscape": true,
            "allowTemplateLiterals": true,
        }],

        "require-await": "warn",
        "semi": "warn",
        "no-console": "warn",
    },
}, {
    files: ["**/*.ts"],

    languageOptions: {
        parserOptions: {
            project: ["./tsconfig.eslint.json"],
        },
    },

    rules: {
        "@typescript-eslint/no-misused-promises": "error",
        "@typescript-eslint/no-floating-promises": "error",
    },
}]);

import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";

export default [
    {ignores: ["build", "dist"]},
    {
        files: ["**/*.{js,jsx}"],
        languageOptions: {
            ecmaVersion: "latest",
            sourceType: "module",
            globals: {...globals.browser, ...globals.node, ...globals.vitest},
            parserOptions: {ecmaFeatures: {jsx: true}},
        },
        rules: {
            ...js.configs.recommended.rules,
            "no-unused-vars": ["error", {varsIgnorePattern: "^[A-Z_]"}],
        },
    },
    reactHooks.configs.flat.recommended,
    reactRefresh.configs.vite,
];

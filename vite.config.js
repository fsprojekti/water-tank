import {readFileSync} from "node:fs";
import {defineConfig} from "vite";
import react from "@vitejs/plugin-react";
import {viteSingleFile} from "vite-plugin-singlefile";

//Standalone page: inline favicon, drop links to files that won't exist next to it
const standaloneHtml = () => ({
    name: "standalone-html",
    transformIndexHtml: {
        order: "pre",
        handler: (html) => {
            const favicon = readFileSync("public/favicon.ico").toString("base64");
            return html
                .replace(/\s*<link rel="(apple-touch-icon|manifest)"[^>]*>/g, "")
                .replace('href="/favicon.ico"', `href="data:image/x-icon;base64,${favicon}"`);
        },
    },
});

export default defineConfig(({mode}) => {
    //`vite build --mode single` produces one self-contained HTML file
    const single = mode === "single";
    return {
        plugins: [react(), ...(single ? [viteSingleFile(), standaloneHtml()] : [])],
        server: {port: 3000},
        build: single
            ? {outDir: "dist-single", copyPublicDir: false, chunkSizeWarningLimit: 2000}
            : {outDir: "build"},
        test: {
            environment: "jsdom",
            globals: true,
            setupFiles: "./src/setupTests.js",
        },
    };
});

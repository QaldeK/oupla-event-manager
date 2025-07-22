import tailwindcss from "@tailwindcss/vite";
import { svelteTesting } from "@testing-library/svelte/vite";
import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";
import { visualizer } from "rollup-plugin-visualizer";

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit(),
		visualizer({
			emitFile: true,
			filename: "stats.html"
		})
	],

	test: {
		workspace: [
			{
				extends: "./vite.config.ts",
				plugins: [svelteTesting()],

				test: {
					name: "client",
					environment: "jsdom",
					clearMocks: true,
					include: ["src/**/*.svelte.{test,spec}.{js,ts}"],
					exclude: ["src/lib/server/**"],
					setupFiles: ["./vitest-setup-client.ts"]
				}
			},
			{
				extends: "./vite.config.ts",

				test: {
					name: "server-or-lib", // Renommons-le pour plus de clarté
					environment: "jsdom", // MODIFICATION: node -> jsdom
					include: ["src/**/*.{test,spec}.{js,ts}"],
					exclude: ["src/**/*.svelte.{test,spec}.{js,ts}"],
					setupFiles: ["./vitest-setup-client.ts"] // AJOUT: On charge le setup ici aussi
				}
			}
		]
	}
});

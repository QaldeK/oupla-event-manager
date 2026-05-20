import adapter from "@sveltejs/adapter-cloudflare";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://svelte.dev/docs/kit/integrations
	// for more information about preprocessors
	preprocess: vitePreprocess({ script: true }),

	vitePlugin: {
		inspector: {
			toggleKeyCombo: "alt-x",
			showToggleButton: "always",
			toggleButtonPos: "bottom-right"
		}
	},

	kit: {
		adapter: adapter()
	}
};

export default config;

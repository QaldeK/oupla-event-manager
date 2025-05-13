<script lang="ts">
	import { Editor } from "@tadashi/svelte-editor-quill";

	interface Props {
		html: string | undefined;
	}
	let { html = $bindable() }: Props = $props();

	const options = {
		theme: "snow",
		placeholder: "tapez votre description ici"
	};
	let text = $state("");

	let debounceTimer;

	const onTextChange = (markup: string, plaintext: string) => {
		html = markup;
		text = plaintext;
	};

	// 	clearTimeout(debounceTimer);
	// 	debounceTimer = setTimeout(() => {
	// 		// Émettre un événement avec les données "data"
	// 		dataContent = data;
	// 	}, 500);
	// };
</script>

<svelte:head>
	<link rel="stylesheet" href="https://unpkg.com/quill@2.0.3/dist/quill.snow.css" crossorigin />
</svelte:head>

<Editor {options} {onTextChange}>{@html $state.snapshot(html)}</Editor>

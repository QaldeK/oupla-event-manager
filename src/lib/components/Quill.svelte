<script>
	import { Editor } from '@tadashi/svelte-editor-quill';

	let { html = $bindable() } = $props();

	const options = {
		theme: 'snow',
		placeholder: 'tapez votre description ici'
	};
	let text = $state('');

	let debounceTimer;

	const onTextChange = (markup, plaintext) => {
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

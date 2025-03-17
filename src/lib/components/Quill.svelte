<script>
	import { Editor } from '@tadashi/svelte-editor-quill';

	let { dataContent = $bindable() } = $props();

	const options = {
		theme: 'snow',
		placeholder: 'tapez votre description ici'
	};
	let data = $state(dataContent);
	let text = null;
	let html = null;

	let debounceTimer;

	const onTextChange = (event) => {
		html = event?.detail?.html ?? '';
		data = html;

		clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => {
			// Émettre un événement avec les données "data"
			dataContent = data;
		}, 500);
	};
</script>

<svelte:head>
	<link rel="stylesheet" href="https://unpkg.com/quill@2.0.2/dist/quill.snow.css" crossorigin />
</svelte:head>

<Editor {options} {data} on:text-change={onTextChange} />

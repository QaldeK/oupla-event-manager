<script>
	// TODO Sépérator Select
	let { separator = $bindable("") } = $props();

	const separators = [
		{ id: 1, text: "═════ ◈ ═════" },
		{ id: 2, text: "﹋﹋﹋﹋﹋﹋﹋﹋﹋﹋﹋﹋﹋﹋" },
		{ id: 3, text: "————————————————" },
		{ id: 4, text: "•------------------------•" },
		{ id: 5, text: "━┅━┅━┅━┅━┅━┅━┅━┅━┅━" },
		{ id: 6, text: "• • • • • • • • • • •" },
		{ id: 7, text: "༺═──────────────═༻" },
		{ id: 8, text: "≫ ──── ≪•◦ ❈ ◦•≫ ──── ≪" },
		{ id: 9, text: "⊱ ────── {⋆⌘⋆} ────── ⊰" },
		{ id: 10, text: "-------- ≪ °✾° ≫ --------" },
		{ id: 11, text: "⋘ ──── ∗ ⋅◈⋅ ∗ ──── ⋙" },
		{ id: 12, text: "━━━━━━ ◦ ❖ ◦ ━━━━━━" },
		{ id: 13, text: ">───⇌••⇋───<" },
		{ id: 14, text: "───●◎●───" },
		{ id: 15, text: "•═•═•═•═•═•═•═•═•" }
	];
</script>

<input bind:value={separator} list="separators" />
<datalist id="separators">
	{#each separators as separator}
		<option value={separator.text} />
	{/each}
</datalist>

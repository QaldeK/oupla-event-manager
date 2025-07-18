<script lang="ts">
	import type { TipexEditor } from "@friendofsvelte/tipex";
	import { LinkIcon, Minus } from "lucide-svelte";
	import Bold from "lucide-svelte/icons/bold";
	import Italic from "lucide-svelte/icons/italic";
	import List from "lucide-svelte/icons/list";

	let { editor }: { editor: TipexEditor | undefined } = $props();

	const btnClass = "btn btn-sm btn-ghost p-1 hover:bg-base-200";
	const activeClass = "bg-base-300";

	// --- Actions extraites avec gestion des types ---

	const toggleBold = () => {
		if (!editor) return;
		// @ts-expect-error - Les commandes TipTap fonctionnent mais les types ne sont pas parfaits
		editor.chain().focus().toggleBold().run();
	};

	const toggleItalic = () => {
		if (!editor) return;
		// @ts-expect-error - fonctionnel
		editor.chain().focus().toggleItalic().run();
	};

	const toggleBulletList = () => {
		if (!editor) return;
		// @ts-expect-error - fonctionnel
		editor.chain().focus().toggleBulletList().run();
	};

	const setHorizontalRule = () => {
		if (!editor) return;
		// @ts-expect-error - fonctionnel
		editor.chain().focus().setHorizontalRule().run();
	};

	// Fonction pour ajouter/supprimer un lien
	const toggleLinkAction = () => {
		if (!editor) return;

		// Si le curseur est déjà sur un lien, on le supprime
		if (editor.isActive("link")) {
			editor.chain().focus().unsetLink().run();
			return;
		}

		const url = prompt("Entrez l'URL du lien :", "");

		if (url === null) return;
		if (url === "") {
			editor.chain().focus().extendMarkRange("link").unsetLink().run();
			return;
		}
		editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
	};
</script>

{#if editor}
	<div
		class="border-base-300 bg-base-200 flex flex-wrap items-center gap-1 rounded-t-lg border-b p-2"
	>
		<button
			type="button"
			title="Gras"
			class="{btnClass} {editor.isActive('bold') ? activeClass : ''}"
			onclick={toggleBold}
		>
			<Bold size={18} strokeWidth={2.5} />
		</button>
		<button
			type="button"
			title="Italique"
			class="{btnClass} {editor.isActive('italic') ? activeClass : ''}"
			onclick={toggleItalic}
		>
			<Italic size={18} strokeWidth={2.5} />
		</button>
		<button
			type="button"
			title="Liste à puces"
			class="{btnClass} {editor.isActive('bulletList') ? activeClass : ''}"
			onclick={toggleBulletList}
		>
			<List size={18} strokeWidth={2.5} />
		</button>
		<button title="Ligne horizontale" class={btnClass} type="button" onclick={setHorizontalRule}>
			<Minus size={18} strokeWidth={2.5} />
		</button>
		<button
			type="button"
			title="Ajouter/Supprimer un lien"
			class="{btnClass} {editor.isActive('link') ? activeClass : ''}"
			onclick={toggleLinkAction}
		>
			<LinkIcon size={18} strokeWidth={2.5} />
		</button>
	</div>
{/if}

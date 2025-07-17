<script lang="ts">
	import type { TipexEditor } from "@friendofsvelte/tipex";
	import { LinkIcon, Minus } from "lucide-svelte";
	import Bold from "lucide-svelte/icons/bold";
	import Italic from "lucide-svelte/icons/italic";
	import List from "lucide-svelte/icons/list";

	let { editor }: { editor: TipexEditor | undefined } = $props();

	const btnClass = "btn btn-sm btn-ghost p-1 hover:bg-base-200";
	const activeClass = "bg-base-300";

	// Fonction pour ajouter/supprimer un lien
	const toggleLinkAction = () => {
		if (!editor) return;

		// Si le curseur est déjà sur un lien, on le supprime
		if (editor.isActive("link")) {
			editor.chain().focus().unsetLink().run();
			return;
		}

		// Sinon, on demande l'URL et on crée le lien
		const url = prompt("Entrez l'URL du lien :", ""); // Utilise prompt pour la simplicité

		// Si l'utilisateur annule ou ne met rien (on pourrait valider l'URL ici)
		if (url === null) {
			return; // Ne fait rien si l'utilisateur annule
		}
		// Si l'URL est vide, on supprime le lien potentiel (au cas où)
		if (url === "") {
			editor.chain().focus().extendMarkRange("link").unsetLink().run();
			return;
		}

		// Applique le lien
		editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
	};

	const toogleBold = () => {
		if (!editor) return;
		editor.commands.toogleBold();
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
			onclick={toogleBold}
		>
			<Bold size={18} strokeWidth={2.5} />
		</button>
		<button
			type="button"
			title="Italique"
			class="{btnClass} {editor.isActive('italic') ? activeClass : ''}"
			onclick={() => editor?.chain().focus().toggleItalic().run()}
		>
			<Italic size={18} strokeWidth={2.5} />
		</button>
		<button
			type="button"
			title="Liste à puces"
			class="{btnClass} {editor.isActive('bulletList') ? activeClass : ''}"
			onclick={() => editor?.chain().focus().toggleBulletList().run()}
		>
			<List size={18} strokeWidth={2.5} />
		</button>
		<button
			title="Ligne horizontale"
			class={btnClass}
			type="button"
			onclick={() => editor?.chain().focus().setHorizontalRule().run()}
		>
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

<script lang="ts">
	import type { Editor } from '@tiptap/core';
	import Bold from 'lucide-svelte/icons/bold';
	import Italic from 'lucide-svelte/icons/italic';
	import LinkIcon from 'lucide-svelte/icons/link';
	import Heading1 from 'lucide-svelte/icons/heading-1';
	import Heading2 from 'lucide-svelte/icons/heading-2';
	import Heading3 from 'lucide-svelte/icons/heading-3';
	import Heading4 from 'lucide-svelte/icons/heading-4';

	import List from 'lucide-svelte/icons/list';
	import Quote from 'lucide-svelte/icons/quote';
	import Minus from 'lucide-svelte/icons/minus'; // Pour horizontal rule
	import Undo from 'lucide-svelte/icons/undo-2';
	import Redo from 'lucide-svelte/icons/redo-2';

	interface Props {
		editor: Editor | undefined;
	}
	let { editor }: Props = $props();

	// --- Commandes Tiptap ---
	const toggleBold = () => editor?.chain().focus().toggleBold().run();
	const toggleItalic = () => editor?.chain().focus().toggleItalic().run();
	const setHeading = (level: 1 | 2 | 3) => editor?.chain().focus().toggleHeading({ level }).run();
	// const setTextAlign = (align: 'left' | 'center' | 'right' /* | 'justify' */) =>
	// 	editor?.chain().focus().setTextAlign(align).run();
	const toggleBulletList = () => editor?.chain().focus().toggleBulletList().run();
	const toggleBlockquote = () => editor?.chain().focus().toggleBlockquote().run();
	const setHorizontalRule = () => editor?.chain().focus().setHorizontalRule().run();
	const undo = () => editor?.chain().focus().undo().run();
	const redo = () => editor?.chain().focus().redo().run();

	// Fonction pour ajouter/supprimer un lien
	const toggleLinkAction = () => {
		if (!editor) return;

		// Si le curseur est déjà sur un lien, on le supprime
		if (editor.isActive('link')) {
			editor.chain().focus().unsetLink().run();
			return;
		}

		// Sinon, on demande l'URL et on crée le lien
		const url = prompt("Entrez l'URL du lien :", ''); // Utilise prompt pour la simplicité

		// Si l'utilisateur annule ou ne met rien (on pourrait valider l'URL ici)
		if (url === null) {
			return; // Ne fait rien si l'utilisateur annule
		}
		// Si l'URL est vide, on supprime le lien potentiel (au cas où)
		if (url === '') {
			editor.chain().focus().extendMarkRange('link').unsetLink().run();
			return;
		}

		// Applique le lien
		editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
	};

	// --- Styles des boutons ---
	// Utilise les classes DaisyUI/Tailwind pour un style simple
	const btnClass = 'btn btn-sm btn-ghost p-1 hover:bg-base-200';
	const activeClass = 'bg-base-300'; // Classe pour bouton actif
</script>

{#if editor}
	<div
		class="border-base-300 bg-base-100 flex flex-wrap items-center gap-1 rounded-t-lg border-b p-2"
	>
		<!-- Style -->
		<button
			title="Gras"
			class="{btnClass} {editor.isActive('bold') ? activeClass : ''}"
			onclick={toggleBold}
			disabled={!editor.can().toggleBold()}
		>
			<Bold size={18} strokeWidth={2.5} />
		</button>
		<button
			title="Italique"
			class="{btnClass} {editor.isActive('italic') ? activeClass : ''}"
			onclick={toggleItalic}
			disabled={!editor.can().toggleItalic()}
		>
			<Italic size={18} strokeWidth={2.5} />
		</button>

		<!-- Titres -->
		<button
			title="Titre 2"
			class="{btnClass} {editor.isActive('heading', { level: 2 }) ? activeClass : ''}"
			onclick={() => setHeading(2)}
			disabled={!editor.can().toggleHeading({ level: 2 })}
		>
			<Heading2 size={18} strokeWidth={2.5} />
		</button>
		<button
			title="Titre 3"
			class="{btnClass} {editor.isActive('heading', { level: 3 }) ? activeClass : ''}"
			onclick={() => setHeading(3)}
			disabled={!editor.can().toggleHeading({ level: 3 })}
		>
			<Heading3 size={18} strokeWidth={2.5} />
		</button>
		<button
			title="Titre 4"
			class="{btnClass} {editor.isActive('heading', { level: 4 }) ? activeClass : ''}"
			onclick={() => setHeading(4)}
			disabled={!editor.can().toggleHeading({ level: 4 })}
		>
			<Heading4 size={18} strokeWidth={2.5} />
		</button>

		<div class="divider divider-horizontal mx-1 my-0 h-6 self-center"></div>

		<!-- Blocs -->
		<button
			title="Liste à puces"
			class="{btnClass} {editor.isActive('bulletList') ? activeClass : ''}"
			onclick={toggleBulletList}
			disabled={!editor.can().toggleBulletList()}
		>
			<List size={18} strokeWidth={2.5} />
		</button>
		<button
			title="Citation"
			class="{btnClass} {editor.isActive('blockquote') ? activeClass : ''}"
			onclick={toggleBlockquote}
			disabled={!editor.can().toggleBlockquote()}
		>
			<Quote size={18} strokeWidth={2.5} />
		</button>
		<button
			title="Ligne horizontale"
			class={btnClass}
			onclick={setHorizontalRule}
			disabled={!editor.can().setHorizontalRule()}
		>
			<Minus size={18} strokeWidth={2.5} />
		</button>
		<button
			title="Ajouter/Supprimer un lien"
			class="{btnClass} {editor.isActive('link') ? activeClass : ''}"
			onclick={toggleLinkAction}
			disabled={!editor
				.can()
				.chain()
				.focus()
				.extendMarkRange('link')
				.setLink({ href: 'test' })
				.run() && !editor.can().chain().focus().unsetLink().run()}
		>
			<LinkIcon size={18} strokeWidth={2.5} />
		</button>

		<div class="divider divider-horizontal mx-1 my-0 h-6 self-center"></div>

		<!-- Historique -->
		<button title="Annuler" class={btnClass} onclick={undo} disabled={!editor.can().undo()}>
			<Undo size={18} strokeWidth={2.5} />
		</button>
		<button title="Rétablir" class={btnClass} onclick={redo} disabled={!editor.can().redo()}>
			<Redo size={18} strokeWidth={2.5} />
		</button>
	</div>
{:else}
	<!-- Optionnel : Placeholder pendant le chargement de l'éditeur -->
	<div
		class="border-base-300 bg-base-100 flex h-[46px] items-center justify-center rounded-t-lg border-b p-2"
	>
		<span class="loading loading-spinner loading-sm"></span>
	</div>
{/if}

<style>
	button:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}
</style>

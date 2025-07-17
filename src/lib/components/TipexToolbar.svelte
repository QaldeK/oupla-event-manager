<script lang="ts">
	import type { TipexEditor } from "@friendofsvelte/tipex";
	import Bold from "lucide-svelte/icons/bold";
	import Italic from "lucide-svelte/icons/italic";
	import LinkIcon from "lucide-svelte/icons/link";
	import Heading2 from "lucide-svelte/icons/heading-2";
	import Heading3 from "lucide-svelte/icons/heading-3";
	import Heading4 from "lucide-svelte/icons/heading-4";
	import Pilcrow from "lucide-svelte/icons/pilcrow"; // Pour Paragraphe

	import List from "lucide-svelte/icons/list";
	import ListOrdered from "lucide-svelte/icons/list-ordered";
	import Quote from "lucide-svelte/icons/quote";
	import Minus from "lucide-svelte/icons/minus"; // Pour horizontal rule
	import Undo from "lucide-svelte/icons/undo-2";
	import Redo from "lucide-svelte/icons/redo-2";
	import Save from "lucide-svelte/icons/save";

	interface Props {
		editor: TipexEditor | undefined;
		onSaveAndClose?: () => void;
		isSaving?: boolean;
		isLoading?: boolean;
		hasChange?: boolean;
	}
	let {
		editor,
		onSaveAndClose,
		isSaving = false,
		isLoading = false,
		hasChange = false
	}: Props = $props();

	// --- Commandes Tiptap ---
	const toggleBold = () => {
		// @ts-expect-error - Les commandes TipTap fonctionnent mais les types ne sont pas parfaits
		editor?.chain().focus().toggleBold().run();
	};
	const toggleItalic = () => {
		// @ts-expect-error - ...
		editor?.chain().focus().toggleItalic().run();
	};
	const setHeading = (level: 1 | 2 | 3 | 4) => {
		// @ts-expect-error - ...
		editor?.chain().focus().toggleHeading({ level }).run();
	};
	const setParagraph = () => {
		// @ts-expect-error - ...
		editor?.chain().focus().setParagraph().run();
	};
	// const setTextAlign = (align: 'left' | 'center' | 'right' /* | 'justify' */) =>
	// 	editor?.chain().focus().setTextAlign(align).run();
	const toggleBulletList = () => {
		// @ts-expect-error - ...
		editor?.chain().focus().toggleBulletList().run();
	};
	const toggleBlockquote = () => {
		// @ts-expect-error - ...
		editor?.chain().focus().toggleBlockquote().run();
	};
	const setHorizontalRule = () => {
		// @ts-expect-error - ...
		editor?.chain().focus().setHorizontalRule().run();
	};
	const toggleOrderedList = () => {
		// @ts-expect-error - ...
		editor?.chain().focus().toggleOrderedList().run();
	};
	// const alignLeft = () => editor?.chain().focus().setTextAlign('left').run();
	// const alignCenter = () => editor?.chain().focus().setTextAlign('center').run();
	// const alignRight = () => editor?.chain().focus().setTextAlign('right').run();
	// const justify = () => editor?.chain().focus().setTextAlign('justify').run();

	// 👉 Commandes undo/redo avec approche permissive pour TypeScript
	const undo = () => {
		try {
			// @ts-expect-error - Les commandes undo/redo existent au runtime même si les types ne les reconnaissent pas
			editor?.chain().focus().undo().run();
		} catch (error) {
			console.warn("Commande undo non disponible:", error);
		}
	};

	const redo = () => {
		try {
			// @ts-expect-error - Les commandes undo/redo existent au runtime même si les types ne les reconnaissent pas
			editor?.chain().focus().redo().run();
		} catch (error) {
			console.warn("Commande redo non disponible:", error);
		}
	};

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

	// --- Styles des boutons ---
	// Utilise les classes DaisyUI/Tailwind pour un style simple
	const btnClass = "btn btn-square btn-sm p-1 ";
	const activeClass = "bg-base-300"; // Classe pour bouton actif
</script>

{#if editor}
	<div class="flex w-full flex-wrap items-center gap-2 rounded-t-lg border-b p-2">
		<!-- Style -->
		<button
			title="Gras"
			class="{btnClass} {editor.isActive('bold') ? activeClass : ''}"
			onclick={toggleBold}
		>
			<Bold size={18} strokeWidth={2.5} />
		</button>
		<button
			title="Italique"
			class="{btnClass} {editor.isActive('italic') ? activeClass : ''}"
			onclick={toggleItalic}
		>
			<Italic size={18} strokeWidth={2.5} />
		</button>

		<div class="dropdown dropdown-hover rounded-lg border">
			<label class="btn btn-sm btn-soft flex cursor-pointer items-center gap-1">
				<!-- Show current heading/paragraph icon or default -->
				{#if editor.isActive("paragraph")}
					<Pilcrow size={18} strokeWidth={2.5} />
					<span class="hidden sm:inline">Paragraphe</span>
				{:else if editor.isActive("blockquote")}
					<Quote size={18} strokeWidth={2.5} />
					<span class="hidden sm:inline">Citation</span>
				{:else if editor.isActive("heading", { level: 2 })}
					<Heading2 size={18} strokeWidth={2.5} />
					<span class="hidden sm:inline">Titre 2</span>
				{:else if editor.isActive("heading", { level: 3 })}
					<Heading3 size={18} strokeWidth={2.5} />
					<span class="hidden sm:inline">Titre 3</span>
				{:else if editor.isActive("heading", { level: 4 })}
					<Heading4 size={18} strokeWidth={2.5} />
					<span class="hidden sm:inline">Titre 4</span>
				{:else}
					<span class="hidden sm:inline">Titre/Paragraphe</span>
				{/if}
				<svg class="ml-1 h-3 w-3 opacity-60" viewBox="0 0 20 20" fill="none"
					><path
						d="M6 8l4 4 4-4"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					/></svg
				>
			</label>
			<ul class="dropdown-content menu bg-base-200 rounded-box z-[1] w-36 p-2 shadow">
				<li>
					<button
						title="Paragraphe"
						class="flex w-full items-center {editor.isActive('paragraph') ? activeClass : ''}"
						onclick={setParagraph}
					>
						<Pilcrow size={16} strokeWidth={2.5} />
						<span class="ml-2">Paragraphe</span>
					</button>
				</li>
				<li>
					<button
						title="Citation"
						class="flex w-full items-center {editor.isActive('blockquote') ? activeClass : ''}"
						onclick={toggleBlockquote}
					>
						<Quote size={18} strokeWidth={2.5} />
						<span class="ml-2">Citation</span>
					</button>
				</li>
				<li>
					<button
						title="Titre 2"
						class="flex w-full items-center {editor.isActive('heading', { level: 2 })
							? activeClass
							: ''}"
						onclick={() => setHeading(2)}
					>
						<Heading2 size={16} strokeWidth={2.5} />
						<span class="ml-2">Titre 2</span>
					</button>
				</li>
				<li>
					<button
						title="Titre 3"
						class="flex w-full items-center {editor.isActive('heading', { level: 3 })
							? activeClass
							: ''}"
						onclick={() => setHeading(3)}
					>
						<Heading3 size={16} strokeWidth={2.5} />
						<span class="ml-2">Titre 3</span>
					</button>
				</li>
				<li>
					<button
						title="Titre 4"
						class="flex w-full items-center {editor.isActive('heading', { level: 4 })
							? activeClass
							: ''}"
						onclick={() => setHeading(4)}
					>
						<Heading4 size={16} strokeWidth={2.5} />
						<span class="ml-2">Titre 4</span>
					</button>
				</li>
			</ul>
		</div>

		<!-- Blocs -->
		<button
			title="Liste à puces"
			class="{btnClass} {editor.isActive('bulletList') ? activeClass : ''}"
			onclick={toggleBulletList}
		>
			<List size={18} strokeWidth={2.5} />
		</button>

		<button
			title="Liste numérotée"
			class="{btnClass} {editor.isActive('orderedList') ? activeClass : ''}"
			onclick={toggleOrderedList}
		>
			<ListOrdered size={18} strokeWidth={2.5} />
		</button>

		<!-- <div class="dropdown dropdown-hover">
			<div
				tabindex="0"
				role="button"
				class="{btnClass} {editor.isActive({ textAlign: 'left' }) ||
				editor.isActive({ textAlign: 'center' }) ||
				editor.isActive({ textAlign: 'right' }) ||
				editor.isActive({ textAlign: 'justify' })
					? activeClass
					: ''}"
			>
				<AlignLeft size={18} strokeWidth={2.5} />
			</div>
			<ul class="dropdown-content menu bg-base-200 rounded-box z-[1] w-36 p-2 shadow">
				<li>
					<button
						title="Aligner à gauche"
						class="flex items-center {editor.isActive({ textAlign: 'left' }) ? 'bg-base-300' : ''}"
						onclick={alignLeft}
					>
						<AlignLeft size={16} strokeWidth={2.5} />
						<span class="ml-2">Gauche</span>
					</button>
				</li>
				<li>
					<button
						title="Aligner au centre"
						class="flex items-center {editor.isActive({ textAlign: 'center' })
							? 'bg-base-300'
							: ''}"
						onclick={alignCenter}
					>
						<AlignCenter size={16} strokeWidth={2.5} />
						<span class="ml-2">Centre</span>
					</button>
				</li>
				<li>
					<button
						title="Aligner à droite"
						class="flex items-center {editor.isActive({ textAlign: 'right' }) ? 'bg-base-300' : ''}"
						onclick={alignRight}
					>
						<AlignRight size={16} strokeWidth={2.5} />
						<span class="ml-2">Droite</span>
					</button>
				</li>
				<li>
					<button
						title="Justifier"
						class="flex items-center {editor.isActive({ textAlign: 'justify' })
							? 'bg-base-300'
							: ''}"
						onclick={justify}
					>
						<AlignJustify size={16} strokeWidth={2.5} />
						<span class="ml-2">Justifier</span>
					</button>
				</li>
			</ul>
		</div> -->

		<button title="Ligne horizontale" class={btnClass} onclick={setHorizontalRule}>
			<Minus size={18} strokeWidth={2.5} />
		</button>
		<button
			title="Ajouter/Supprimer un lien"
			class="{btnClass} {editor.isActive('link') ? activeClass : ''}"
			onclick={toggleLinkAction}
		>
			<LinkIcon size={18} strokeWidth={2.5} />
		</button>

		<div class="divider divider-vertical m-0 self-center text-gray-400 not-md:hidden">|</div>

		<!-- Historique -->
		<button title="Annuler" class={btnClass} onclick={undo}>
			<Undo size={18} strokeWidth={2.5} />
		</button>
		<button title="Rétablir" class={btnClass} onclick={redo}>
			<Redo size={18} strokeWidth={2.5} />
		</button>

		{#if onSaveAndClose}
			<!-- Bouton Enregistrer et Fermer -->
			<button
				title="Enregistrer les modifications et passer en mode lecture"
				class="btn btn-primary btn-sm ms-auto"
				onclick={onSaveAndClose}
				disabled={isLoading || isSaving || !hasChange}
			>
				{#if isSaving}
					<span class="loading"></span>
				{:else}
					<Save size={16} />
				{/if}
				<span class="hidden sm:inline">Enregistrer</span>
			</button>
		{/if}
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

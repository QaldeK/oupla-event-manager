<script lang="ts">
	import { tooltip } from "$lib/actions/tooltip";

	import { BadgeHelp, ThumbsDown, ThumbsUp } from "lucide-svelte";

	interface Props {
		value?: "oui" | "non" | "peut-être" | "";
		onChange?: (value: "oui" | "non" | "peut-être" | "") => void;
		size?: string;
		variant?: string;
	}

	let { value, onChange, size = "btn-sm", variant = "" }: Props = $props();

	const getActiveVariant = (buttonValue: string) => {
		if (value === buttonValue) {
			switch (buttonValue) {
				case "oui":
					return "bg-success/20";
				case "peut-être":
					return "bg-warning/20";
				case "non":
					return "bg-error/20";
				default:
					return variant;
			}
		}
		return variant;
	};
</script>

<div class="inline-flex items-center rounded-md">
	<div use:tooltip={{ content: "Je serais présent·e" }}>
		<button
			onclick={() => {
				value = "oui";
				onChange?.(value);
			}}
			aria-label="Oui"
			class="btn {size} rounded-e-none border-gray-300 {getActiveVariant('oui')}"
		>
			<ThumbsUp />
		</button>
	</div>

	<div use:tooltip={{ content: "Je ne serais pas présent·e" }}>
		<button
			onclick={() => {
				value = "non";
				onChange?.(value);
			}}
			aria-label="Non"
			class="btn {size} rounded-none border-y border-gray-300 {getActiveVariant('non')}"
		>
			<ThumbsDown />
		</button>
	</div>

	<div use:tooltip={{ content: "Je ne suis pas certain·e d'être présent·e" }}>
		<button
			onclick={() => {
				value = "peut-être";
				onChange?.(value);
			}}
			aria-label="Peut-être"
			class="btn {size}  rounded-s-none border-gray-300 {getActiveVariant('peut-être')}"
		>
			<BadgeHelp />
		</button>
	</div>

	<!-- {#if value}
		<div use:tooltip={{ content: 'Supprimer ma réponse' }}>
			<button
				onclick={() => {
					value = '';
					onChange?.(value);
				}}
				aria-label="Supprimer ma réponse"
				class="btn {size} rounded-s-none"
			>
				<Minus class="h-4 w-4" />
			</button>
		</div>
	{/if} -->
</div>

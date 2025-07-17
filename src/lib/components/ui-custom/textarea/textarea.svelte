<script lang="ts">
	/**
	 * Version personnalisée du Textarea avec support du debounce
	 * @component
	 * @example
	 * <Textarea
	 *   value={text}
	 *   debounce={{
	 *     enabled: true,
	 *     wait: 300,
	 *     onChange: (v) => console.log(v)
	 *   }}
	 * />
	 */
	import { Textarea as ShadcnTextarea } from "$lib/components/ui/textarea";
	import type { WithElementRef, WithoutChildren } from "bits-ui";

	import type { HTMLTextareaAttributes } from "svelte/elements";

	type TextareaProps = WithoutChildren<WithElementRef<HTMLTextareaAttributes>> & {
		debounce?: {
			enabled?: boolean;
			wait?: number;
			onChange?: (value: string) => void;
		};
	};

	let { value = $bindable(""), debounce, ...props }: TextareaProps = $props();

	let timeoutId: ReturnType<typeof setTimeout>;

	function handleChange(newValue: string) {
		if (!debounce?.enabled) {
			return;
		}

		clearTimeout(timeoutId);
		timeoutId = setTimeout(() => {
			debounce.onChange?.(newValue);
		}, debounce.wait ?? 400);
	}

	$effect(() => {
		return () => {
			clearTimeout(timeoutId);
		};
	});

	$effect(() => {
		if (value !== undefined && value !== null) {
			handleChange(String(value));
		}
	});
</script>

<ShadcnTextarea bind:value {...props} />

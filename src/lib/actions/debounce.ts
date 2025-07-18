/*

<script lang="ts">
  import { debounceInput } from './debounce';

  // Avec événement
  let value = $state('');
  function handleDebouncedInput(e: CustomEvent<string>) {
    value = e.detail;
  }

  // Avec callback
  let otherValue = $state('');
</script>

<input
  use:debounceInput={{ wait: 300 }}
  on:debouncedInput={handleDebouncedInput}
/>

<input
  use:debounceInput={{
    wait: 300,
    onChange: (newValue) => otherValue = newValue
  }}
/>

*/
export function debounce(
	node: HTMLInputElement | HTMLTextAreaElement,
	options: {
		wait?: number;
		onChange?: (value: string) => void;
	} = {}
) {
	const wait = options.wait ?? 400;
	let timeoutId: ReturnType<typeof setTimeout>;

	function handleInput(event: Event) {
		clearTimeout(timeoutId);
		timeoutId = setTimeout(() => {
			options.onChange?.((event.target as HTMLInputElement | HTMLTextAreaElement).value);
		}, wait);
	}

	node.addEventListener("input", handleInput);

	return {
		destroy() {
			clearTimeout(timeoutId);
			node.removeEventListener("input", handleInput);
		},
		update(newOptions: typeof options) {
			options = newOptions;
		}
	};
}

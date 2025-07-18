import type { HTMLTextareaAttributes } from "svelte/elements";

export interface DebounceOptions {
	enabled?: boolean;
	wait?: number;
	onChange?: (value: string) => void;
}

export interface CustomTextareaProps extends HTMLTextareaAttributes {
	debounce?: DebounceOptions;
}

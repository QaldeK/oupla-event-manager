import DOMPurify from "dompurify";
type SafeHtmlOptions = Parameters<typeof DOMPurify.sanitize>[1];

type SafeHtmlParams = {
	html: string;
	options?: SafeHtmlOptions;
	allowLink?: boolean;
};

const defaultTags = ["p", "b", "i", "em", "strong", "ul", "ol", "li", "br", "span"];
const linkTags = ["a"];
const defaultAttrs = ["class"];
const linkAttrs = ["href", "target", "rel"];

export function safeHtml(node: HTMLElement, params: SafeHtmlParams) {
	const { html, options, allowLink } = params;

	const allowedTags = allowLink ? [...defaultTags, ...linkTags] : defaultTags;
	const allowedAttrs = allowLink ? [...defaultAttrs, ...linkAttrs] : defaultAttrs;

	const mergedOptions: SafeHtmlOptions = {
		ALLOWED_TAGS: allowedTags,
		ALLOWED_ATTR: allowedAttrs,
		...(options ?? {})
	};

	const sanitized = DOMPurify.sanitize(html, mergedOptions);
	node.innerHTML = sanitized;

	return {
		update(newParams: SafeHtmlParams) {
			const { html: newHtml, options: newOptions, allowLink: newAllowLink } = newParams;
			const allowedTags = newAllowLink ? [...defaultTags, ...linkTags] : defaultTags;
			const allowedAttrs = newAllowLink ? [...defaultAttrs, ...linkAttrs] : defaultAttrs;
			const mergedOptions: SafeHtmlOptions = {
				ALLOWED_TAGS: allowedTags,
				ALLOWED_ATTR: allowedAttrs,
				...(newOptions ?? {})
			};
			const newSanitized = DOMPurify.sanitize(newHtml, mergedOptions);
			node.innerHTML = newSanitized;
		}
	};
}

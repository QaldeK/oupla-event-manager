/* Usage :
 <div use:clickOutside={() => {console.log('Clicked outside')}}> ... </div>
Warn : insert class 'click-inside' on the child element if you want to exclude it (exemple: for multi-select component) */
export function clickOutside(node: HTMLElement, callback: () => void) {
	function handleClick(event: MouseEvent) {
		const target = event.target as Node;
		const htmlTarget = event.target as HTMLElement;
		if (node && !node.contains(target) && !htmlTarget?.closest?.(".click-inside") && callback) {
			callback();
		}
	}

	document.addEventListener("click", handleClick);

	return {
		destroy() {
			document.removeEventListener("click", handleClick);
		}
	};
}

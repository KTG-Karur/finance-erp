/**
 * Form Navigation & Auto-Focus Utility
 * 
 * Automatically locates the first invalid / error-highlighted form element,
 * smoothly scrolls the parent container/viewport to it, and applies keyboard focus
 * with a subtle attention-grabbing pulse.
 */

export function focusAndScrollToFirstError(containerOrForm = document) {
  if (!containerOrForm) return false;

  const root = typeof containerOrForm === 'string'
    ? document.querySelector(containerOrForm) || document
    : (containerOrForm.current || containerOrForm);

  if (!root) return false;

  // Selectors matching invalid elements across native inputs and shared custom components
  const selectors = [
    '[aria-invalid="true"]',
    '.is-invalid',
    '.has-error input',
    '.has-error select',
    '.has-error textarea',
    '.has-error button',
    '.form-field--error input',
    '.form-field--error select',
    '.form-field--error button',
    '[data-invalid="true"]',
    ':invalid'
  ];

  const invalidElements = Array.from(root.querySelectorAll(selectors.join(', ')));

  // Filter for visible and interactable elements
  const target = invalidElements.find(el => {
    if (!el || el.disabled || el.type === 'hidden') return false;
    const style = window.getComputedStyle(el);
    return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
  });

  if (target) {
    // 1. Smoothly scroll into the center of viewport / scrollable modal
    try {
      target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
    } catch {
      target.scrollIntoView(false);
    }

    // 2. Focus the element safely
    setTimeout(() => {
      try {
        target.focus({ preventScroll: true });
      } catch {
        target.focus();
      }

      // 3. Add temporary pulse animation class
      target.classList.add('error-pulse-active');
      setTimeout(() => target.classList.remove('error-pulse-active'), 1200);
    }, 150);

    return true;
  }

  return false;
}

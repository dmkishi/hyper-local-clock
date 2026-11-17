<!--
  A modal on the browser's own dialog, which traps focus, closes on Escape,
  and hands focus back to the button that opened it.
-->
<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    title: string;
    open: boolean;
    children: Snippet;
  }

  let { title, open = $bindable(), children }: Props = $props();

  const id = $props.id();
  let dialog: HTMLDialogElement;

  $effect(() => {
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  });
</script>

<!--
  The dialog has no padding of its own, so a click that lands on it and not on
  its content is a click on the backdrop. Escape is the keyboard's way out.
-->
<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
<dialog
  class="modal"
  bind:this={dialog}
  aria-labelledby="{id}-title"
  onclose={() => {
    open = false;
  }}
  onclick={(event) => {
    if (event.target === dialog) open = false;
  }}
>
  <div class="modal__content">
    <header class="modal__header">
      <h2 class="modal__title" id="{id}-title">{title}</h2>
      <button
        class="modal__close"
        type="button"
        aria-label="Close"
        onclick={() => {
          open = false;
        }}
      >
        <svg class="modal__close-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
    </header>
    {@render children()}
  </div>
</dialog>

<style>
  .modal {
    box-sizing: border-box;
    width: min(100% - 2rem, 28rem);
    max-width: none;
    max-height: calc(100dvh - 2rem);
    padding: 0;
    overflow-y: auto;
    border: 1px solid var(--border-control);
    border-radius: 0.75rem;
    background: Canvas;
    color: CanvasText;
  }

  .modal::backdrop {
    background: rgb(0 0 0 / 50%);
  }

  .modal__content {
    display: grid;
    gap: 1rem;
    padding: 1rem 1.25rem 1.25rem;
  }

  .modal__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
  }

  .modal__title {
    margin: 0;
    font-size: 1.25rem;
    line-height: 1.2;
  }

  .modal__close {
    display: grid;
    flex: none;
    place-content: center;
    width: 2.75rem;
    height: 2.75rem;
    margin: -0.5rem -0.75rem -0.5rem 0;
    padding: 0;
    border: 0;
    border-radius: 50%;
    background: none;
    color: inherit;
    cursor: pointer;
  }

  .modal__close:hover {
    background: color-mix(in srgb, CanvasText 12%, transparent);
  }

  .modal__close:focus-visible {
    outline: var(--focus-ring);
    outline-offset: -2px;
  }

  .modal__close-icon {
    width: 1.5rem;
    height: 1.5rem;
    fill: none;
    stroke: currentColor;
    stroke-width: 2;
    stroke-linecap: round;
  }
</style>

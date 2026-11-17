<!-- A row of radio buttons drawn as one control, for a choice among a few short options. -->
<script lang="ts" generics="T extends string">
  interface Props {
    /** Names the choice. Always read to screen readers. */
    legend: string;
    /** Keep the legend off screen, where the surroundings already say what the choice is. */
    legendHidden?: boolean;
    /** The radio group's name, unique on the page. */
    name: string;
    options: readonly { value: T; label: string }[];
    value: T;
  }

  let { legend, legendHidden = false, name, options, value = $bindable() }: Props = $props();
</script>

<fieldset class="segmented">
  <legend class={['segmented__legend', legendHidden && 'segmented__legend--hidden']}>{legend}</legend>
  <div class="segmented__options">
    {#each options as option (option.value)}
      <label class="segmented__option">
        <input class="segmented__radio" type="radio" {name} value={option.value} bind:group={value} />
        <span class="segmented__label">{option.label}</span>
      </label>
    {/each}
  </div>
</fieldset>

<style>
  .segmented {
    min-width: 0;
    margin: 0;
    padding: 0;
    border: 0;
  }

  .segmented__legend {
    margin-bottom: 0.25rem;
    padding: 0;
    font-size: 0.875rem;
    font-weight: 600;
  }

  .segmented__legend--hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }

  .segmented__options {
    display: grid;
    grid-auto-flow: column;
    grid-auto-columns: 1fr;
    gap: 0.125rem;
    padding: 0.125rem;
    border: 1px solid var(--border-control);
    border-radius: 0.5rem;
  }

  .segmented__option {
    position: relative;
    display: grid;
    cursor: pointer;
  }

  .segmented__radio {
    position: absolute;
    inset: 0;
    margin: 0;
    opacity: 0;
    cursor: pointer;
  }

  .segmented__label {
    padding: 0.375rem 0.5rem;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    text-align: center;
  }

  .segmented__radio:checked + .segmented__label {
    background: CanvasText;
    color: Canvas;
  }

  .segmented__radio:focus-visible + .segmented__label {
    outline: var(--focus-ring);
    outline-offset: 2px;
  }
</style>

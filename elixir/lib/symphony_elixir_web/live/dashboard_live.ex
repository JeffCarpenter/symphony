defmodule SymphonyElixirWeb.DashboardLive do
  @moduledoc """
  Live Mandelbrot visualization surface.
  """

  use Phoenix.LiveView, layout: {SymphonyElixirWeb.Layouts, :app}

  @impl true
  def mount(_params, _session, socket) do
    {:ok, socket}
  end

  @impl true
  def render(assigns) do
    ~H"""
    <section class="fractal-shell" id="mandelbrot-app" data-renderer="mandelbrot">
      <header class="fractal-header">
        <p class="eyebrow">Mandelbrot Explorer</p>
        <h1>Mandelbrot Set</h1>
      </header>

      <section class="fractal-workbench" aria-label="Mandelbrot fractal visualization">
        <div class="fractal-stage">
          <canvas
            id="mandelbrot-canvas"
            class="fractal-canvas"
            width="640"
            height="420"
            aria-label="Colorized Mandelbrot fractal"
          >
          </canvas>

          <div class="render-hud" aria-live="polite">
            <span id="render-status">Rendering</span>
            <span id="render-resolution">640 x 420</span>
          </div>
        </div>

        <form class="control-panel" aria-label="Fractal controls">
          <label class="control-field">
            <span>Palette</span>
            <select id="palette-select" name="palette">
              <option value="aurora">Aurora</option>
              <option value="ember">Ember</option>
              <option value="prism">Prism</option>
            </select>
          </label>

          <label class="control-field">
            <span>Detail</span>
            <input id="detail-range" type="range" min="96" max="384" step="24" value="192" />
          </label>

          <div class="button-row">
            <button id="zoom-in" type="button">Zoom in</button>
            <button id="zoom-out" type="button" class="secondary">Zoom out</button>
            <button id="reset-view" type="button" class="secondary">Reset</button>
          </div>
        </form>
      </section>
    </section>
    """
  end
end

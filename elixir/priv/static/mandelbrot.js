(function () {
  var INITIAL_VIEW = {
    centerX: -0.72,
    centerY: 0,
    scale: 3.05
  };
  var DEFAULT_DETAIL = "192";
  var INITIAL_SYNC_PIXEL_LIMIT = 50000;
  var INITIAL_SYNC_ITERATION_LIMIT = 128;
  var ROW_PIXEL_BUDGET = 60000;
  var RESIZE_DEBOUNCE_MS = 120;
  var ZOOM_IN_FACTOR = 0.58;
  var ZOOM_OUT_FACTOR = 1.72;
  var CLICK_ZOOM_FACTOR = 0.78;

  var palettes = {
    aurora: { hue: 180, hueSpan: 130, saturation: 72, lightness: 12, lightnessSpan: 58 },
    ember: { hue: 18, hueSpan: 58, saturation: 84, lightness: 14, lightnessSpan: 60 },
    prism: { hue: 270, hueSpan: 250, saturation: 80, lightness: 16, lightnessSpan: 56 }
  };

  function initMandelbrot() {
    var canvas = document.getElementById("mandelbrot-canvas");
    if (!canvas || canvas.dataset.bound === "true") return;

    canvas.dataset.bound = "true";

    var ctx = canvas.getContext("2d");
    var app = document.getElementById("mandelbrot-app");
    var paletteSelect = document.getElementById("palette-select");
    var detailRange = document.getElementById("detail-range");
    var zoomIn = document.getElementById("zoom-in");
    var zoomOut = document.getElementById("zoom-out");
    var reset = document.getElementById("reset-view");
    var status = document.getElementById("render-status");
    var resolution = document.getElementById("render-resolution");

    if (
      !ctx ||
      !app ||
      !paletteSelect ||
      !detailRange ||
      !zoomIn ||
      !zoomOut ||
      !reset ||
      !status ||
      !resolution
    ) {
      return;
    }

    var view = Object.assign({}, INITIAL_VIEW);
    var renderToken = 0;
    var resizeTimer = null;
    var renderedOnce = false;

    function scheduleRender() {
      renderToken += 1;
      var token = renderToken;

      if (!renderedOnce) {
        renderedOnce = true;
        render(token);
        return;
      }

      window.requestAnimationFrame(function () {
        render(token);
      });
    }

    function sizeCanvas() {
      var rect = canvas.getBoundingClientRect();
      var viewportWidth = Math.max(window.innerWidth || rect.width, 320);
      var viewportHeight = Math.max(window.innerHeight || rect.height, 320);
      var maxCssWidth = Math.max(viewportWidth - 24, 320);
      var maxCssHeight =
        viewportWidth <= 560 ? Math.max(viewportHeight * 0.36, 260) : viewportHeight;
      var cssWidth = Math.max(Math.floor(Math.min(rect.width, maxCssWidth)), 320);
      var cssHeight = Math.max(Math.floor(Math.min(rect.height, maxCssHeight)), 260);
      var ratio = Math.min(window.devicePixelRatio || 1, 1.5, 1400 / cssWidth, 920 / cssHeight);

      ratio = Math.max(ratio, 0.65);
      canvas.width = Math.floor(cssWidth * ratio);
      canvas.height = Math.floor(cssHeight * ratio);
      resolution.textContent = canvas.width + " x " + canvas.height;
    }

    function render(token) {
      sizeCanvas();

      var width = canvas.width;
      var height = canvas.height;
      var maxIterations = parseInt(detailRange.value, 10);
      var image = ctx.createImageData(width, height);
      var data = image.data;
      var aspect = width / height;
      var scaleX = view.scale * aspect;
      var row = 0;
      var pixelCount = width * height;
      var rowsPerFrame =
        pixelCount <= INITIAL_SYNC_PIXEL_LIMIT && maxIterations <= INITIAL_SYNC_ITERATION_LIMIT
          ? height
          : Math.max(2, Math.floor(ROW_PIXEL_BUDGET / width));
      var palette = palettes[paletteSelect.value] || palettes.aurora;

      status.textContent = "Rendering";

      function drawRows() {
        if (token !== renderToken) return;

        var rowLimit = Math.min(height, row + rowsPerFrame);

        for (; row < rowLimit; row += 1) {
          var cy = view.centerY + (row / height - 0.5) * view.scale;

          for (var col = 0; col < width; col += 1) {
            var cx = view.centerX + (col / width - 0.5) * scaleX;
            var offset = (row * width + col) * 4;

            writeMandelbrotColor(data, offset, cx, cy, maxIterations, palette);
          }
        }

        ctx.putImageData(image, 0, 0);

        if (row < height) {
          window.requestAnimationFrame(drawRows);
        } else {
          status.textContent = maxIterations + " iterations";
        }
      }

      drawRows();
    }

    function zoom(factor) {
      view.scale *= factor;
      scheduleRender();
    }

    paletteSelect.addEventListener("change", scheduleRender);
    detailRange.addEventListener("input", scheduleRender);
    zoomIn.addEventListener("click", function () {
      zoom(ZOOM_IN_FACTOR);
    });
    zoomOut.addEventListener("click", function () {
      zoom(ZOOM_OUT_FACTOR);
    });
    reset.addEventListener("click", function () {
      view = Object.assign({}, INITIAL_VIEW);
      detailRange.value = DEFAULT_DETAIL;
      paletteSelect.value = "aurora";
      scheduleRender();
    });
    canvas.addEventListener("click", function (event) {
      var rect = canvas.getBoundingClientRect();
      var x = (event.clientX - rect.left) / rect.width - 0.5;
      var y = (event.clientY - rect.top) / rect.height - 0.5;
      var aspect = canvas.width / canvas.height;

      view.centerX += x * view.scale * aspect;
      view.centerY += y * view.scale;
      view.scale *= CLICK_ZOOM_FACTOR;
      scheduleRender();
    });
    window.addEventListener("resize", function () {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(scheduleRender, RESIZE_DEBOUNCE_MS);
    });

    scheduleRender();
  }

  function writeMandelbrotColor(data, offset, cx, cy, maxIterations, palette) {
    var zx = 0;
    var zy = 0;
    var xx = 0;
    var yy = 0;
    var iteration = 0;

    while (iteration < maxIterations && xx + yy <= 4) {
      zy = 2 * zx * zy + cy;
      zx = xx - yy + cx;
      xx = zx * zx;
      yy = zy * zy;
      iteration += 1;
    }

    if (iteration === maxIterations) {
      data[offset] = 5;
      data[offset + 1] = 7;
      data[offset + 2] = 9;
      data[offset + 3] = 255;
      return;
    }

    var smooth = iteration + 2 - Math.log(Math.log(xx + yy)) / Math.LN2;
    var t = clamp(smooth / maxIterations, 0, 1);
    var edge = Math.min(1, t * 8);
    var sqrtT = Math.sqrt(t);
    var hue = palette.hue + palette.hueSpan * t;
    var lightness = palette.lightness + palette.lightnessSpan * sqrtT;

    writeHslToRgb(data, offset, hue, palette.saturation, lightness, edge);
  }

  function writeHslToRgb(data, offset, h, s, l, edge) {
    h = ((h % 360) + 360) % 360;
    s /= 100;
    l /= 100;

    var c = (1 - Math.abs(2 * l - 1)) * s;
    var hp = h / 60;
    var x = c * (1 - Math.abs((hp % 2) - 1));
    var r = 0;
    var g = 0;
    var b = 0;

    if (hp < 1) {
      r = c;
      g = x;
    } else if (hp < 2) {
      r = x;
      g = c;
    } else if (hp < 3) {
      g = c;
      b = x;
    } else if (hp < 4) {
      g = x;
      b = c;
    } else if (hp < 5) {
      r = x;
      b = c;
    } else {
      r = c;
      b = x;
    }

    var m = l - c / 2;
    data[offset] = Math.round((r + m) * 255 * edge);
    data[offset + 1] = Math.round((g + m) * 255 * edge);
    data[offset + 2] = Math.round((b + m) * 255 * edge);
    data[offset + 3] = 255;
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  window.addEventListener("DOMContentLoaded", initMandelbrot);
  window.addEventListener("phx:page-loading-stop", initMandelbrot);
})();

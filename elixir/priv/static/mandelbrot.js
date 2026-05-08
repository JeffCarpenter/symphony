(function () {
  var INITIAL_VIEW = {
    centerX: -0.72,
    centerY: 0,
    scale: 3.05
  };

  var paletteFns = {
    aurora: function (t) {
      return hslToRgb(180 + 130 * t, 72, 12 + 58 * Math.sqrt(t));
    },
    ember: function (t) {
      return hslToRgb(18 + 58 * t, 84, 14 + 60 * Math.sqrt(t));
    },
    prism: function (t) {
      return hslToRgb(270 + 250 * t, 80, 16 + 56 * Math.sqrt(t));
    }
  };

  function initMandelbrot() {
    var canvas = document.getElementById("mandelbrot-canvas");
    if (!canvas || canvas.dataset.bound === "true") return;

    canvas.dataset.bound = "true";

    var ctx = canvas.getContext("2d", { alpha: false });
    var app = document.getElementById("mandelbrot-app");
    var paletteSelect = document.getElementById("palette-select");
    var detailRange = document.getElementById("detail-range");
    var zoomIn = document.getElementById("zoom-in");
    var zoomOut = document.getElementById("zoom-out");
    var reset = document.getElementById("reset-view");
    var status = document.getElementById("render-status");
    var resolution = document.getElementById("render-resolution");

    if (!ctx || !app || !paletteSelect || !detailRange || !zoomIn || !zoomOut || !reset) return;

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
      var maxCssHeight = viewportWidth <= 560 ? Math.max(viewportHeight * 0.36, 260) : viewportHeight;
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
        pixelCount <= 700000 && maxIterations <= 216 ? height : Math.max(4, Math.floor(260000 / width));
      var palette = paletteFns[paletteSelect.value] || paletteFns.aurora;

      status.textContent = "Rendering";

      function drawRows() {
        if (token !== renderToken) return;

        var rowLimit = Math.min(height, row + rowsPerFrame);

        for (; row < rowLimit; row += 1) {
          var cy = view.centerY + (row / height - 0.5) * view.scale;

          for (var col = 0; col < width; col += 1) {
            var cx = view.centerX + (col / width - 0.5) * scaleX;
            var color = mandelbrotColor(cx, cy, maxIterations, palette);
            var offset = (row * width + col) * 4;

            data[offset] = color[0];
            data[offset + 1] = color[1];
            data[offset + 2] = color[2];
            data[offset + 3] = 255;
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
      zoom(0.58);
    });
    zoomOut.addEventListener("click", function () {
      zoom(1.72);
    });
    reset.addEventListener("click", function () {
      view = Object.assign({}, INITIAL_VIEW);
      detailRange.value = "192";
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
      view.scale *= 0.78;
      scheduleRender();
    });
    window.addEventListener("resize", function () {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(scheduleRender, 120);
    });

    scheduleRender();
  }

  function mandelbrotColor(cx, cy, maxIterations, palette) {
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
      return [5, 7, 9];
    }

    var smooth = iteration + 1 - Math.log(Math.log(Math.sqrt(xx + yy))) / Math.LN2;
    var t = clamp(smooth / maxIterations, 0, 1);
    var color = palette(t);
    var edge = Math.min(1, t * 8);

    return [
      Math.round(color[0] * edge),
      Math.round(color[1] * edge),
      Math.round(color[2] * edge)
    ];
  }

  function hslToRgb(h, s, l) {
    h = ((h % 360) + 360) % 360;
    s /= 100;
    l /= 100;

    var c = (1 - Math.abs(2 * l - 1)) * s;
    var hp = h / 60;
    var x = c * (1 - Math.abs((hp % 2) - 1));
    var rgb = [0, 0, 0];

    if (hp < 1) rgb = [c, x, 0];
    else if (hp < 2) rgb = [x, c, 0];
    else if (hp < 3) rgb = [0, c, x];
    else if (hp < 4) rgb = [0, x, c];
    else if (hp < 5) rgb = [x, 0, c];
    else rgb = [c, 0, x];

    var m = l - c / 2;
    return [
      Math.round((rgb[0] + m) * 255),
      Math.round((rgb[1] + m) * 255),
      Math.round((rgb[2] + m) * 255)
    ];
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  window.addEventListener("DOMContentLoaded", initMandelbrot);
  window.addEventListener("phx:page-loading-stop", initMandelbrot);
})();

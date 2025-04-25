/**
 * Chart.js Scrollbar Plugin
 *
 * This plugin adds a scrollbar to Chart.js charts to improve navigation
 * for large datasets. It provides a visual representation of the viewable
 * area within the complete dataset range.
 */

const scrollbarPlugin = {
  id: "chartScrollbar",
  defaults: {
    scrollbarWidth: 8,
    scrollbarColor: "rgba(128, 128, 128, 0.3)",
    scrollbarHoverColor: "rgba(128, 128, 128, 0.5)",
    scrollbarBorderRadius: 4,
  },
  // Store state for scrollbar interaction
  _isDragging: false,
  _startX: 0,
  _startScrollPosition: 0,

  // Calculate if a point is inside the scrollbar thumb
  _isPointInThumb(chart, x, y) {
    const { chartArea, scales } = chart;
    const { left, right, bottom } = chartArea;
    const { x: xScale } = scales;

    if (!xScale) return false;

    const range = xScale.max - xScale.min;
    const total = xScale._userMax - xScale._userMin;
    const scrollbarWidth = right - left;
    const thumbWidth = Math.max(scrollbarWidth * (range / total), 40);
    const scrollPosition =
      ((xScale.min - xScale._userMin) / (total - range)) *
      (scrollbarWidth - thumbWidth);

    // Check if point is within the thumb area
    return (
      x >= left + scrollPosition &&
      x <= left + scrollPosition + thumbWidth &&
      y >= bottom + 10 &&
      y <= bottom + 10 + this.defaults.scrollbarWidth
    );
  },

  // Handle mouse down on the scrollbar
  _handleMouseDown(chart, event) {
    const rect = event.chart.canvas.getBoundingClientRect();
    const x = event.native.clientX - rect.left;
    const y = event.native.clientY - rect.top;

    // Check if click is on the scrollbar thumb
    if (this._isPointInThumb(chart, x, y)) {
      this._isDragging = true;
      this._startX = x;

      const { chartArea, scales } = chart;
      const { left, right } = chartArea;
      const { x: xScale } = scales;
      const range = xScale.max - xScale.min;
      const total = xScale._userMax - xScale._userMin;
      const scrollbarWidth = right - left;
      const thumbWidth = Math.max(scrollbarWidth * (range / total), 40);

      // Store the initial scroll position
      this._startScrollPosition =
        ((xScale.min - xScale._userMin) / (total - range)) *
        (scrollbarWidth - thumbWidth);

      // Change cursor to indicate dragging
      document.body.style.cursor = "grabbing";
    }
  },

  // Handle mouse move for scrollbar dragging
  _handleMouseMove(chart, event) {
    if (!this._isDragging) return;

    const rect = event.chart.canvas.getBoundingClientRect();
    const x = event.native.clientX - rect.left;

    const { chartArea, scales } = chart;
    const { left, right } = chartArea;
    const { x: xScale } = scales;

    if (!xScale) return;

    const deltaX = x - this._startX;
    const scrollbarWidth = right - left;
    const range = xScale.max - xScale.min;
    const total = xScale._userMax - xScale._userMin;
    const thumbWidth = Math.max(scrollbarWidth * (range / total), 40);

    // Calculate new scroll position
    let newScrollPosition = this._startScrollPosition + deltaX;
    newScrollPosition = Math.max(
      0,
      Math.min(newScrollPosition, scrollbarWidth - thumbWidth)
    );

    // Calculate new min/max values for the chart
    const scrollPercentage = newScrollPosition / (scrollbarWidth - thumbWidth);
    const newMin = xScale._userMin + scrollPercentage * (total - range);
    const newMax = newMin + range;

    // Update the chart view
    chart.options.scales.x.min = newMin;
    chart.options.scales.x.max = newMax;
    chart.update("none");
  },

  // Handle mouse up to end dragging
  _handleMouseUp() {
    if (this._isDragging) {
      this._isDragging = false;
      document.body.style.cursor = "";
    }
  },

  // Register event handlers
  beforeInit(chart) {
    const plugin = this;

    chart.canvas.addEventListener("mousedown", (e) => {
      const rect = chart.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Check if click is on the scrollbar track but not on thumb
      const { chartArea, scales } = chart;
      const { left, right, bottom } = chartArea;
      const { x: xScale } = scales;

      if (!xScale) return;

      // Check if click is on the scrollbar track
      if (
        x >= left &&
        x <= right &&
        y >= bottom + 10 &&
        y <= bottom + 10 + plugin.defaults.scrollbarWidth &&
        !plugin._isPointInThumb(chart, x, y)
      ) {
        // Calculate the position to jump to
        const scrollbarWidth = right - left;
        const range = xScale.max - xScale.min;
        const total = xScale._userMax - xScale._userMin;
        const thumbWidth = Math.max(scrollbarWidth * (range / total), 40);

        // Calculate where in the track the user clicked
        const clickPosition = x - left;
        const scrollPercentage = clickPosition / scrollbarWidth;

        // Calculate new min/max values for the chart
        const newMin = xScale._userMin + scrollPercentage * (total - range / 2);
        const newMax = newMin + range;

        // Update the chart view
        chart.options.scales.x.min = Math.max(
          xScale._userMin,
          Math.min(newMin, xScale._userMax - range)
        );
        chart.options.scales.x.max = Math.min(
          xScale._userMax,
          Math.max(newMax, xScale._userMin + range)
        );
        chart.update("none");
      }
    });

    // Add global event listeners for mouse up
    document.addEventListener("mouseup", () => plugin._handleMouseUp());
    document.addEventListener("mouseleave", () => plugin._handleMouseUp());
  },

  // Hook into Chart.js events
  beforeEvent(chart, args) {
    const event = args.event;

    if (event.type === "mousedown") {
      this._handleMouseDown(chart, event);
    } else if (event.type === "mousemove") {
      this._handleMouseMove(chart, event);
    }
  },

  afterDraw(chart, args, options) {
    const { ctx, chartArea, scales } = chart;
    const { left, right, bottom } = chartArea;
    const { x } = scales;

    if (!x) return;

    const range = x.max - x.min;
    const total = x._userMax - x._userMin;
    const scrollbarWidth = right - left;
    const thumbWidth = Math.max(scrollbarWidth * (range / total), 40);
    const scrollPosition =
      ((x.min - x._userMin) / (total - range)) * (scrollbarWidth - thumbWidth);

    // Draw scrollbar track
    ctx.beginPath();
    ctx.fillStyle = options.scrollbarColor;
    ctx.roundRect(
      left,
      bottom + 10,
      scrollbarWidth,
      options.scrollbarWidth,
      options.scrollbarBorderRadius
    );
    ctx.fill();

    // Draw scrollbar thumb
    ctx.beginPath();
    ctx.fillStyle = this._isDragging
      ? options.scrollbarHoverColor
      : options.scrollbarColor;
    ctx.roundRect(
      left + scrollPosition,
      bottom + 10,
      thumbWidth,
      options.scrollbarWidth,
      options.scrollbarBorderRadius
    );
    ctx.fill();

    // Add visual indicator to show it's interactive
    if (thumbWidth > 15) {
      ctx.beginPath();
      ctx.fillStyle = "rgba(255, 255, 255, 0.5)";

      // Draw grip lines
      for (let i = 0; i < 3; i++) {
        ctx.roundRect(
          left + scrollPosition + thumbWidth / 2 - 6 + i * 6,
          bottom + 10 + options.scrollbarWidth / 2 - 1,
          2,
          2,
          1
        );
      }
      ctx.fill();
    }
  },
};

// Export for use in other components
export default scrollbarPlugin;

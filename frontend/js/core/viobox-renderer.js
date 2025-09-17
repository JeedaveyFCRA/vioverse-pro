/**
 * VioboxRenderer - Handles rendering of violation boxes on PDF canvas
 * Fully data-driven with configurable colors and styles
 */

export class VioboxRenderer {
    constructor(severityConfig, canvasConfig) {
        this.severityConfig = severityConfig;
        this.canvasConfig = canvasConfig;
        this.visible = true;
        this.selectedViolations = new Set();
        this.hoveredViolation = null;
    }

    /**
     * Draw all violation boxes on canvas
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {Array} violations - Violations to render
     * @param {Object} viewport - PDF viewport info
     * @param {Number} scale - Current scale factor
     * @param {Object} filters - Active filters
     */
    draw(ctx, violations, viewport, scale, filters = {}) {
        if (!this.visible || !violations || violations.length === 0) {
            return;
        }

        // Save canvas state
        ctx.save();

        // Draw each violation
        violations.forEach(violation => {
            if (this.shouldRenderViolation(violation, filters)) {
                this.drawViobox(ctx, violation, scale);
            }
        });

        // Restore canvas state
        ctx.restore();
    }

    /**
     * Check if violation should be rendered based on filters
     * @param {Object} violation - Violation data
     * @param {Object} filters - Active filters
     * @returns {Boolean} Should render
     */
    shouldRenderViolation(violation, filters) {
        // Skip violations without coordinates
        if (!violation.hasCoordinates) {
            return false;
        }

        // Check bureau filter
        if (filters.bureaus && !filters.bureaus.includes(violation.bureau)) {
            return false;
        }

        // Check severity filter
        if (filters.severities && !filters.severities.includes(violation.severity)) {
            return false;
        }

        // Check page filter
        if (filters.page && violation.page !== filters.page) {
            return false;
        }

        return true;
    }

    /**
     * Draw single violation box
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {Object} violation - Violation data
     * @param {Number} scale - Scale factor
     */
    drawViobox(ctx, violation, scale) {
        // Calculate scaled coordinates
        const coords = this.calculateCoordinates(violation, scale);

        // Get colors based on severity
        const colors = this.getColorsForSeverity(violation.severity);

        // Check if selected or hovered
        const isSelected = this.selectedViolations.has(violation.rule_id);
        const isHovered = this.hoveredViolation === violation.rule_id;

        // Draw filled rectangle
        ctx.fillStyle = isSelected ? colors.selectedFill : colors.fillColor;
        ctx.fillRect(coords.x, coords.y, coords.width, coords.height);

        // Draw border
        ctx.strokeStyle = isHovered ? this.canvasConfig.selectionHighlight : colors.color;
        ctx.lineWidth = isSelected ? 3 : this.canvasConfig.lineWidth || 2;
        ctx.strokeRect(coords.x, coords.y, coords.width, coords.height);

        // Draw label if configured
        if (this.canvasConfig.showRuleLabels && violation.rule_id) {
            this.drawLabel(ctx, violation.rule_id, coords, colors.color, scale);
        }

        // Draw coordinates if debug mode
        if (this.canvasConfig.showCoordinates) {
            this.drawCoordinates(ctx, coords, scale);
        }
    }

    /**
     * Calculate scaled coordinates for violation
     * @param {Object} violation - Violation data
     * @param {Number} scale - Scale factor
     * @returns {Object} Scaled coordinates
     */
    calculateCoordinates(violation, scale) {
        // PDF coordinates have origin at bottom-left
        // Canvas has origin at top-left
        // Need to flip Y coordinate

        const x = violation.x * scale;
        const width = violation.width * scale;
        const height = violation.height * scale;

        // Y coordinate needs adjustment for PDF space
        // In PDF space, y is from bottom, so we subtract height
        const y = violation.y * scale - height;

        return { x, y, width, height };
    }

    /**
     * Get colors for severity level
     * @param {String} severity - Severity level
     * @returns {Object} Color configuration
     */
    getColorsForSeverity(severity) {
        const severityLower = (severity || 'unknown').toLowerCase();
        const config = this.severityConfig.severityLevels[severityLower];

        if (!config) {
            // Fallback to unknown severity
            return this.severityConfig.severityLevels.unknown || {
                color: '#6c757d',
                fillColor: 'rgba(108, 117, 125, 0.15)',
                selectedFill: 'rgba(108, 117, 125, 0.3)'
            };
        }

        // Add selected fill color if not defined
        if (!config.selectedFill) {
            config.selectedFill = config.fillColor.replace('0.15', '0.3');
        }

        return config;
    }

    /**
     * Draw rule ID label
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {String} ruleId - Rule ID to display
     * @param {Object} coords - Box coordinates
     * @param {String} color - Label color
     * @param {Number} scale - Scale factor
     */
    drawLabel(ctx, ruleId, coords, color, scale) {
        const fontSize = (this.canvasConfig.labelFontSize || 11) * scale;
        const padding = (this.canvasConfig.labelPadding || 4) * scale;

        ctx.fillStyle = color;
        ctx.font = `bold ${fontSize}px ${this.canvasConfig.labelFont || 'Arial'}`;

        // Position label above box
        const labelX = coords.x + padding;
        const labelY = coords.y - padding;

        // Add background for better readability
        const textMetrics = ctx.measureText(ruleId);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.fillRect(
            labelX - 2,
            labelY - fontSize - 2,
            textMetrics.width + 4,
            fontSize + 4
        );

        // Draw text
        ctx.fillStyle = color;
        ctx.fillText(ruleId, labelX, labelY);
    }

    /**
     * Draw coordinate debug info
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {Object} coords - Box coordinates
     * @param {Number} scale - Scale factor
     */
    drawCoordinates(ctx, coords, scale) {
        const fontSize = 10 * scale;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.font = `${fontSize}px monospace`;

        const text = `x:${Math.round(coords.x)} y:${Math.round(coords.y)}`;
        ctx.fillText(text, coords.x + 2, coords.y + coords.height - 2);
    }

    /**
     * Highlight violation on hover
     * @param {String} ruleId - Rule ID to highlight
     */
    setHovered(ruleId) {
        this.hoveredViolation = ruleId;
    }

    /**
     * Clear hover state
     */
    clearHover() {
        this.hoveredViolation = null;
    }

    /**
     * Toggle violation selection
     * @param {String} ruleId - Rule ID to toggle
     */
    toggleSelection(ruleId) {
        if (this.selectedViolations.has(ruleId)) {
            this.selectedViolations.delete(ruleId);
        } else {
            this.selectedViolations.add(ruleId);
        }
    }

    /**
     * Clear all selections
     */
    clearSelections() {
        this.selectedViolations.clear();
    }

    /**
     * Toggle visibility of all vioboxes
     * @returns {Boolean} New visibility state
     */
    toggleVisibility() {
        this.visible = !this.visible;
        return this.visible;
    }

    /**
     * Set visibility state
     * @param {Boolean} visible - Visibility state
     */
    setVisibility(visible) {
        this.visible = visible;
    }

    /**
     * Check if point is inside any violation box
     * @param {Number} x - X coordinate
     * @param {Number} y - Y coordinate
     * @param {Array} violations - Violations to check
     * @param {Number} scale - Current scale
     * @returns {Object|null} Violation at point or null
     */
    getViolationAtPoint(x, y, violations, scale) {
        // Check violations in reverse order (top to bottom)
        for (let i = violations.length - 1; i >= 0; i--) {
            const violation = violations[i];
            if (!violation.hasCoordinates) continue;

            const coords = this.calculateCoordinates(violation, scale);

            if (x >= coords.x && x <= coords.x + coords.width &&
                y >= coords.y && y <= coords.y + coords.height) {
                return violation;
            }
        }

        return null;
    }

    /**
     * Draw connection lines between related violations
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {Array} violations - Violations to connect
     * @param {Number} scale - Scale factor
     */
    drawConnections(ctx, violations, scale) {
        // Group violations by rule type for connections
        const groups = {};
        violations.forEach(v => {
            if (!v.hasCoordinates) return;
            const type = v.violation_type || 'unknown';
            if (!groups[type]) groups[type] = [];
            groups[type].push(v);
        });

        ctx.save();
        ctx.strokeStyle = 'rgba(128, 128, 128, 0.3)';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);

        // Draw connections within each group
        Object.values(groups).forEach(group => {
            if (group.length < 2) return;

            for (let i = 0; i < group.length - 1; i++) {
                const v1 = group[i];
                const v2 = group[i + 1];

                const c1 = this.calculateCoordinates(v1, scale);
                const c2 = this.calculateCoordinates(v2, scale);

                ctx.beginPath();
                ctx.moveTo(c1.x + c1.width / 2, c1.y + c1.height / 2);
                ctx.lineTo(c2.x + c2.width / 2, c2.y + c2.height / 2);
                ctx.stroke();
            }
        });

        ctx.restore();
    }

    /**
     * Export render configuration
     * @returns {Object} Current renderer configuration
     */
    exportConfig() {
        return {
            visible: this.visible,
            selectedViolations: Array.from(this.selectedViolations),
            severityConfig: this.severityConfig,
            canvasConfig: this.canvasConfig
        };
    }

    /**
     * Import render configuration
     * @param {Object} config - Configuration to import
     */
    importConfig(config) {
        if (config.visible !== undefined) this.visible = config.visible;
        if (config.selectedViolations) {
            this.selectedViolations = new Set(config.selectedViolations);
        }
        if (config.severityConfig) this.severityConfig = config.severityConfig;
        if (config.canvasConfig) this.canvasConfig = config.canvasConfig;
    }
}
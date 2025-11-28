/**
 * Grid Library - Hex and Triangle Grid Utilities
 * Pure geometry logic for non-square grids.
 * No DOM dependencies - rendering helpers provided but caller manages canvas.
 *
 * Coordinate Systems:
 * - Hex: Offset coordinates (row, col) with odd-row offset (pointy-top hexagons)
 * - Triangle: Row/col where triangles alternate pointing up/down
 *
 * Usage:
 *   const hex = new HexGrid(width, height, cellSize);
 *   const neighbors = hex.getNeighbors(x, y);
 *   const {px, py} = hex.gridToPixel(x, y);
 *
 *   const tri = new TriangleGrid(width, height, cellSize);
 *   const neighbors = tri.getNeighbors(x, y);
 */

// ============================================
// Hex Grid (Pointy-top, odd-row offset)
// ============================================

class HexGrid {
    /**
     * Create a hex grid.
     * @param {number} width - Number of columns
     * @param {number} height - Number of rows
     * @param {number} cellSize - Radius of hexagon (center to vertex)
     */
    constructor(width, height, cellSize) {
        this.width = width;
        this.height = height;
        this.cellSize = cellSize;

        // Derived dimensions for pointy-top hexagons
        this.hexWidth = Math.sqrt(3) * cellSize;
        this.hexHeight = 2 * cellSize;
        this.vertSpacing = this.hexHeight * 0.75;
        this.horizSpacing = this.hexWidth;
    }

    /**
     * Check if coordinates are within grid bounds.
     */
    isInBounds(x, y) {
        return x >= 0 && x < this.width && y >= 0 && y < this.height;
    }

    /**
     * Get all neighbors of a cell (edge-adjacent hexes).
     * Returns array of {x, y} objects, filtered to valid bounds.
     */
    getNeighbors(x, y) {
        // Offset coordinates: odd rows shift right
        const isOddRow = y % 2 === 1;

        // Neighbor offsets for pointy-top hex with odd-row offset
        const offsets = isOddRow ? [
            { dx: 1, dy: 0 },   // East
            { dx: 1, dy: -1 },  // Northeast
            { dx: 0, dy: -1 },  // Northwest
            { dx: -1, dy: 0 },  // West
            { dx: 0, dy: 1 },   // Southwest
            { dx: 1, dy: 1 }    // Southeast
        ] : [
            { dx: 1, dy: 0 },   // East
            { dx: 0, dy: -1 },  // Northeast
            { dx: -1, dy: -1 }, // Northwest
            { dx: -1, dy: 0 },  // West
            { dx: -1, dy: 1 },  // Southwest
            { dx: 0, dy: 1 }    // Southeast
        ];

        const neighbors = [];
        for (const { dx, dy } of offsets) {
            const nx = x + dx;
            const ny = y + dy;
            if (this.isInBounds(nx, ny)) {
                neighbors.push({ x: nx, y: ny });
            }
        }
        return neighbors;
    }

    /**
     * Convert grid coordinates to pixel center.
     * @param {number} x - Column
     * @param {number} y - Row
     * @param {number} offsetX - Canvas offset X (default 0)
     * @param {number} offsetY - Canvas offset Y (default 0)
     * @returns {{px: number, py: number}}
     */
    gridToPixel(x, y, offsetX = 0, offsetY = 0) {
        const rowOffset = (y % 2 === 1) ? this.hexWidth / 2 : 0;
        const px = offsetX + x * this.horizSpacing + rowOffset + this.hexWidth / 2;
        const py = offsetY + y * this.vertSpacing + this.cellSize;
        return { px, py };
    }

    /**
     * Convert pixel coordinates to grid coordinates.
     * @returns {{x: number, y: number} | null} Grid coords or null if outside grid
     */
    pixelToGrid(px, py, offsetX = 0, offsetY = 0) {
        // Adjust for offset
        const adjX = px - offsetX;
        const adjY = py - offsetY;

        // Approximate row
        const approxRow = Math.round((adjY - this.cellSize) / this.vertSpacing);

        // Find closest hex by checking nearby candidates
        let bestDist = Infinity;
        let bestX = -1;
        let bestY = -1;

        for (let dy = -1; dy <= 1; dy++) {
            const row = approxRow + dy;
            if (row < 0 || row >= this.height) continue;

            const rowOffset = (row % 2 === 1) ? this.hexWidth / 2 : 0;
            const approxCol = Math.round((adjX - rowOffset - this.hexWidth / 2) / this.horizSpacing);

            for (let dx = -1; dx <= 1; dx++) {
                const col = approxCol + dx;
                if (col < 0 || col >= this.width) continue;

                const { px: hx, py: hy } = this.gridToPixel(col, row, offsetX, offsetY);
                const dist = Math.sqrt((px - hx) ** 2 + (py - hy) ** 2);

                if (dist < bestDist && dist < this.cellSize) {
                    bestDist = dist;
                    bestX = col;
                    bestY = row;
                }
            }
        }

        if (bestX >= 0) {
            return { x: bestX, y: bestY };
        }
        return null;
    }

    /**
     * Get the vertices of a hexagon at given pixel center.
     * @returns {Array<{x: number, y: number}>} Array of 6 vertex coordinates
     */
    getHexVertices(centerX, centerY) {
        const vertices = [];
        for (let i = 0; i < 6; i++) {
            // Pointy-top: start at top vertex (-90 degrees)
            const angle = (Math.PI / 3) * i - Math.PI / 2;
            vertices.push({
                x: centerX + this.cellSize * Math.cos(angle),
                y: centerY + this.cellSize * Math.sin(angle)
            });
        }
        return vertices;
    }

    /**
     * Draw a hexagon on a canvas context.
     */
    drawCell(ctx, x, y, fillColor, strokeColor, offsetX = 0, offsetY = 0) {
        const { px, py } = this.gridToPixel(x, y, offsetX, offsetY);
        const vertices = this.getHexVertices(px, py);

        ctx.beginPath();
        ctx.moveTo(vertices[0].x, vertices[0].y);
        for (let i = 1; i < 6; i++) {
            ctx.lineTo(vertices[i].x, vertices[i].y);
        }
        ctx.closePath();

        if (fillColor) {
            ctx.fillStyle = fillColor;
            ctx.fill();
        }
        if (strokeColor) {
            ctx.strokeStyle = strokeColor;
            ctx.stroke();
        }
    }

    /**
     * Calculate canvas size needed for this grid.
     * @returns {{width: number, height: number}}
     */
    getCanvasSize(padding = 0) {
        const width = this.width * this.horizSpacing + this.hexWidth / 2 + padding * 2;
        const height = this.height * this.vertSpacing + this.cellSize / 2 + padding * 2;
        return { width, height };
    }

    /**
     * Calculate distance between two hex cells (in hex steps).
     * Uses cube coordinate conversion for accurate hex distance.
     */
    distance(x1, y1, x2, y2) {
        // Convert offset to cube coordinates
        const toCube = (x, y) => {
            const cubeX = x - (y - (y % 2)) / 2;
            const cubeZ = y;
            const cubeY = -cubeX - cubeZ;
            return { x: cubeX, y: cubeY, z: cubeZ };
        };

        const c1 = toCube(x1, y1);
        const c2 = toCube(x2, y2);

        return (Math.abs(c1.x - c2.x) + Math.abs(c1.y - c2.y) + Math.abs(c1.z - c2.z)) / 2;
    }
}

// ============================================
// Triangle Grid
// ============================================

class TriangleGrid {
    /**
     * Create a triangle grid.
     * Triangles alternate pointing up and down.
     * @param {number} width - Number of columns (triangles per row)
     * @param {number} height - Number of rows
     * @param {number} cellSize - Side length of triangle
     */
    constructor(width, height, cellSize) {
        this.width = width;
        this.height = height;
        this.cellSize = cellSize;

        // Derived dimensions
        // For equilateral triangles with side length s:
        // height of triangle = s * sqrt(3) / 2
        this.triHeight = cellSize * Math.sqrt(3) / 2;
        // Width of each triangle cell = half the base
        this.triWidth = cellSize / 2;
    }

    /**
     * Check if coordinates are within grid bounds.
     */
    isInBounds(x, y) {
        return x >= 0 && x < this.width && y >= 0 && y < this.height;
    }

    /**
     * Determine if a triangle points up or down.
     * Pattern: alternating based on (x + y) parity
     */
    pointsUp(x, y) {
        return (x + y) % 2 === 0;
    }

    /**
     * Get edge-adjacent neighbors (triangles sharing an edge).
     * Up-pointing triangles have 3 neighbors (left, right, below).
     * Down-pointing triangles have 3 neighbors (left, right, above).
     */
    getNeighbors(x, y) {
        const neighbors = [];
        const up = this.pointsUp(x, y);

        // Left and right neighbors (always exist if in bounds)
        if (this.isInBounds(x - 1, y)) {
            neighbors.push({ x: x - 1, y: y });
        }
        if (this.isInBounds(x + 1, y)) {
            neighbors.push({ x: x + 1, y: y });
        }

        // Vertical neighbor
        if (up) {
            // Up-pointing: neighbor below (same x, y + 1)
            if (this.isInBounds(x, y + 1)) {
                neighbors.push({ x: x, y: y + 1 });
            }
        } else {
            // Down-pointing: neighbor above (same x, y - 1)
            if (this.isInBounds(x, y - 1)) {
                neighbors.push({ x: x, y: y - 1 });
            }
        }

        return neighbors;
    }

    /**
     * Get all neighbors including corner-adjacent (vertex-touching).
     * Returns up to 12 neighbors for comprehensive adjacency.
     */
    getExtendedNeighbors(x, y) {
        const neighbors = [];
        const up = this.pointsUp(x, y);

        // Check all potentially adjacent positions
        const candidates = [
            { dx: -2, dy: 0 },  // Two left
            { dx: -1, dy: -1 }, // Upper-left
            { dx: -1, dy: 0 },  // Left (edge)
            { dx: -1, dy: 1 },  // Lower-left
            { dx: 0, dy: -1 },  // Above (edge for down-pointing)
            { dx: 0, dy: 1 },   // Below (edge for up-pointing)
            { dx: 1, dy: -1 },  // Upper-right
            { dx: 1, dy: 0 },   // Right (edge)
            { dx: 1, dy: 1 },   // Lower-right
            { dx: 2, dy: 0 },   // Two right
        ];

        for (const { dx, dy } of candidates) {
            const nx = x + dx;
            const ny = y + dy;
            if (this.isInBounds(nx, ny)) {
                neighbors.push({ x: nx, y: ny });
            }
        }

        return neighbors;
    }

    /**
     * Convert grid coordinates to pixel center (centroid of triangle).
     */
    gridToPixel(x, y, offsetX = 0, offsetY = 0) {
        const up = this.pointsUp(x, y);

        // X position: each column is triWidth apart
        const px = offsetX + x * this.triWidth + this.triWidth;

        // Y position: depends on row and orientation
        // Row baseline + adjustment for centroid
        let py;
        if (up) {
            // Up-pointing: centroid is 1/3 from base (bottom)
            py = offsetY + y * this.triHeight + this.triHeight * (2 / 3);
        } else {
            // Down-pointing: centroid is 1/3 from base (top)
            py = offsetY + y * this.triHeight + this.triHeight * (1 / 3);
        }

        return { px, py };
    }

    /**
     * Convert pixel coordinates to grid coordinates.
     */
    pixelToGrid(px, py, offsetX = 0, offsetY = 0) {
        const adjX = px - offsetX;
        const adjY = py - offsetY;

        // Approximate position
        const approxX = Math.floor(adjX / this.triWidth);
        const approxY = Math.floor(adjY / this.triHeight);

        // Check nearby candidates for closest match
        let bestDist = Infinity;
        let bestX = -1;
        let bestY = -1;

        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -2; dx <= 2; dx++) {
                const testX = approxX + dx;
                const testY = approxY + dy;

                if (!this.isInBounds(testX, testY)) continue;

                // Check if point is inside this triangle
                if (this.isPointInTriangle(px, py, testX, testY, offsetX, offsetY)) {
                    const { px: cx, py: cy } = this.gridToPixel(testX, testY, offsetX, offsetY);
                    const dist = Math.sqrt((px - cx) ** 2 + (py - cy) ** 2);
                    if (dist < bestDist) {
                        bestDist = dist;
                        bestX = testX;
                        bestY = testY;
                    }
                }
            }
        }

        if (bestX >= 0) {
            return { x: bestX, y: bestY };
        }
        return null;
    }

    /**
     * Check if a pixel point is inside a specific triangle.
     */
    isPointInTriangle(px, py, x, y, offsetX = 0, offsetY = 0) {
        const vertices = this.getTriangleVertices(x, y, offsetX, offsetY);
        return this._pointInPolygon(px, py, vertices);
    }

    /**
     * Get the vertices of a triangle at given grid position.
     * @returns {Array<{x: number, y: number}>} Array of 3 vertex coordinates
     */
    getTriangleVertices(x, y, offsetX = 0, offsetY = 0) {
        const up = this.pointsUp(x, y);
        const baseX = offsetX + x * this.triWidth;
        const baseY = offsetY + y * this.triHeight;

        if (up) {
            // Up-pointing triangle: apex at top
            return [
                { x: baseX + this.triWidth, y: baseY },                    // Top (apex)
                { x: baseX, y: baseY + this.triHeight },                   // Bottom-left
                { x: baseX + this.cellSize, y: baseY + this.triHeight }    // Bottom-right
            ];
        } else {
            // Down-pointing triangle: apex at bottom
            return [
                { x: baseX, y: baseY },                                    // Top-left
                { x: baseX + this.cellSize, y: baseY },                    // Top-right
                { x: baseX + this.triWidth, y: baseY + this.triHeight }    // Bottom (apex)
            ];
        }
    }

    /**
     * Draw a triangle on a canvas context.
     */
    drawCell(ctx, x, y, fillColor, strokeColor, offsetX = 0, offsetY = 0) {
        const vertices = this.getTriangleVertices(x, y, offsetX, offsetY);

        ctx.beginPath();
        ctx.moveTo(vertices[0].x, vertices[0].y);
        ctx.lineTo(vertices[1].x, vertices[1].y);
        ctx.lineTo(vertices[2].x, vertices[2].y);
        ctx.closePath();

        if (fillColor) {
            ctx.fillStyle = fillColor;
            ctx.fill();
        }
        if (strokeColor) {
            ctx.strokeStyle = strokeColor;
            ctx.stroke();
        }
    }

    /**
     * Calculate canvas size needed for this grid.
     */
    getCanvasSize(padding = 0) {
        const width = (this.width + 1) * this.triWidth + padding * 2;
        const height = this.height * this.triHeight + padding * 2;
        return { width, height };
    }

    /**
     * Point-in-polygon test using ray casting.
     * @private
     */
    _pointInPolygon(px, py, vertices) {
        let inside = false;
        const n = vertices.length;

        for (let i = 0, j = n - 1; i < n; j = i++) {
            const xi = vertices[i].x, yi = vertices[i].y;
            const xj = vertices[j].x, yj = vertices[j].y;

            if (((yi > py) !== (yj > py)) &&
                (px < (xj - xi) * (py - yi) / (yj - yi) + xi)) {
                inside = !inside;
            }
        }

        return inside;
    }
}

// ============================================
// Exports
// ============================================

// Browser export
if (typeof window !== 'undefined') {
    window.HexGrid = HexGrid;
    window.TriangleGrid = TriangleGrid;
}

// Node.js export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { HexGrid, TriangleGrid };
}

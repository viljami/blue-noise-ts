/**
 * Blue Noise Library
 *
 * Provides blue noise generation and Poisson disc sampling for even distribution
 * of points in 2D space, commonly used for object placement in procedural generation.
 */

/**
 * A 2D point
 */
export interface Point2D {
  x: number;
  y: number;
}

/**
 * Options for Poisson disc sampling
 */
export interface PoissonDiscOptions {
  /** Minimum distance between points */
  minDistance: number;
  /** Maximum attempts to place a new point (default: 30) */
  maxAttempts?: number;
  /** Random seed for reproducibility (optional) */
  seed?: number;
}

/**
 * Options for blue noise texture generation
 */
export interface BlueNoiseOptions {
  /** Width of the noise texture */
  width: number;
  /** Height of the noise texture */
  height: number;
  /** Random seed for reproducibility (optional) */
  seed?: number;
}

/**
 * Simple seeded random number generator
 * Using a linear congruential generator (LCG)
 */
class SeededRandom {
  private seed: number;

  constructor(seed: number = Date.now()) {
    this.seed = seed % 2147483647;
    if (this.seed <= 0) this.seed += 2147483646;
  }

  /**
   * Returns a random number between 0 and 1
   */
  next(): number {
    this.seed = (this.seed * 16807) % 2147483647;
    return (this.seed - 1) / 2147483646;
  }

  /**
   * Returns a random integer between min (inclusive) and max (exclusive)
   */
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min)) + min;
  }

  /**
   * Returns a random number between min and max
   */
  nextRange(min: number, max: number): number {
    return this.next() * (max - min) + min;
  }
}

/**
 * Poisson Disc Sampling
 *
 * Generates points that are evenly distributed with a minimum distance between them.
 * Perfect for placing trees, rocks, and other objects in a natural-looking way.
 *
 * Based on Bridson's algorithm for fast Poisson disc sampling.
 *
 * @param width - Width of the sampling area
 * @param height - Height of the sampling area
 * @param minDistance - Minimum distance between points
 * @param maxAttempts - Maximum attempts to place a new point (default: 30)
 * @param seed - Random seed for reproducibility
 * @returns Array of points
 *
 * @example
 * ```typescript
 * const points = poissonDiscSampling(800, 600, 30);
 * points.forEach(p => placeTree(p.x, p.y));
 * ```
 */
export function poissonDiscSampling(
  width: number,
  height: number,
  minDistance: number,
  maxAttempts: number = 30,
  seed?: number
): Point2D[] {
  const random = new SeededRandom(seed);
  const cellSize = minDistance / Math.SQRT2;
  const gridWidth = Math.ceil(width / cellSize);
  const gridHeight = Math.ceil(height / cellSize);

  // Grid to store point indices (for fast neighbor lookup)
  const grid: (number | null)[][] = Array(gridWidth)
    .fill(null)
    .map(() => Array(gridHeight).fill(null));

  const points: Point2D[] = [];
  const activeList: number[] = [];

  /**
   * Get grid coordinates for a point
   */
  const getGridCoords = (p: Point2D): [number, number] => {
    return [Math.floor(p.x / cellSize), Math.floor(p.y / cellSize)];
  };

  /**
   * Check if a point is valid (not too close to existing points)
   */
  const isValidPoint = (p: Point2D): boolean => {
    if (p.x < 0 || p.x >= width || p.y < 0 || p.y >= height) {
      return false;
    }

    const [gridX, gridY] = getGridCoords(p);

    // Check neighboring cells
    const searchRadius = 2;
    for (let x = Math.max(0, gridX - searchRadius); x <= Math.min(gridWidth - 1, gridX + searchRadius); x++) {
      for (let y = Math.max(0, gridY - searchRadius); y <= Math.min(gridHeight - 1, gridY + searchRadius); y++) {
        const pointIndex = grid[x][y];
        if (pointIndex !== null) {
          const other = points[pointIndex];
          const dx = p.x - other.x;
          const dy = p.y - other.y;
          const distSq = dx * dx + dy * dy;
          if (distSq < minDistance * minDistance) {
            return false;
          }
        }
      }
    }

    return true;
  };

  /**
   * Add a point to the sampling
   */
  const addPoint = (p: Point2D): void => {
    const index = points.length;
    points.push(p);
    activeList.push(index);
    const [gridX, gridY] = getGridCoords(p);
    grid[gridX][gridY] = index;
  };

  // Add initial random point
  const initialPoint: Point2D = {
    x: random.nextRange(0, width),
    y: random.nextRange(0, height),
  };
  addPoint(initialPoint);

  // Main loop
  while (activeList.length > 0) {
    const activeIndex = random.nextInt(0, activeList.length);
    const pointIndex = activeList[activeIndex];
    const point = points[pointIndex];

    let foundValid = false;

    // Try to generate a new point around the active point
    for (let i = 0; i < maxAttempts; i++) {
      const angle = random.next() * Math.PI * 2;
      const radius = random.nextRange(minDistance, minDistance * 2);
      const newPoint: Point2D = {
        x: point.x + Math.cos(angle) * radius,
        y: point.y + Math.sin(angle) * radius,
      };

      if (isValidPoint(newPoint)) {
        addPoint(newPoint);
        foundValid = true;
        break;
      }
    }

    // If no valid point was found, remove from active list
    if (!foundValid) {
      activeList.splice(activeIndex, 1);
    }
  }

  return points;
}

/**
 * Generate a blue noise texture using void-and-cluster method
 *
 * Creates a 2D array of values with blue noise characteristics.
 * Values are normalized between 0 and 1.
 *
 * @param width - Width of the texture
 * @param height - Height of the texture
 * @param seed - Random seed for reproducibility
 * @returns 2D array of noise values (0-1)
 *
 * @example
 * ```typescript
 * const noise = generateBlueNoise(256, 256);
 * const value = noise[x][y];
 * ```
 */
export function generateBlueNoise(width: number, height: number, seed?: number): number[][] {
  const random = new SeededRandom(seed);
  const size = width * height;

  // Initialize arrays
  const values: number[] = new Array(size).fill(0);
  const order: number[] = [];

  // Create initial random binary pattern
  const binary: boolean[] = new Array(size);
  for (let i = 0; i < size; i++) {
    binary[i] = random.next() < 0.1; // Start with ~10% filled
  }

  /**
   * Calculate Gaussian filter weight
   */
  const gaussianWeight = (dx: number, dy: number, sigma: number = 1.5): number => {
    const distSq = dx * dx + dy * dy;
    return Math.exp(-distSq / (2 * sigma * sigma));
  };

  /**
   * Find largest void (cluster of empty pixels)
   */
  const findLargestVoid = (): number => {
    const energy: number[] = new Array(size).fill(0);
    const radius = Math.min(width, height) * 0.1;

    // Calculate energy for each pixel
    for (let i = 0; i < size; i++) {
      if (binary[i]) continue; // Skip filled pixels

      const x = i % width;
      const y = Math.floor(i / width);

      for (let j = 0; j < size; j++) {
        if (!binary[j]) continue; // Only consider filled pixels

        const ox = j % width;
        const oy = Math.floor(j / width);

        let dx = Math.abs(x - ox);
        let dy = Math.abs(y - oy);

        // Toroidal distance (wrapping)
        if (dx > width / 2) dx = width - dx;
        if (dy > height / 2) dy = height - dy;

        if (dx < radius && dy < radius) {
          energy[i] += gaussianWeight(dx, dy);
        }
      }
    }

    // Find pixel with minimum energy (largest void)
    let minEnergy = Infinity;
    let minIndex = 0;
    for (let i = 0; i < size; i++) {
      if (!binary[i] && energy[i] < minEnergy) {
        minEnergy = energy[i];
        minIndex = i;
      }
    }

    return minIndex;
  };

  /**
   * Find largest cluster (cluster of filled pixels)
   */
  const findLargestCluster = (): number => {
    const energy: number[] = new Array(size).fill(0);
    const radius = Math.min(width, height) * 0.1;

    // Calculate energy for each pixel
    for (let i = 0; i < size; i++) {
      if (!binary[i]) continue; // Skip empty pixels

      const x = i % width;
      const y = Math.floor(i / width);

      for (let j = 0; j < size; j++) {
        if (!binary[j]) continue; // Only consider filled pixels

        const ox = j % width;
        const oy = Math.floor(j / width);

        let dx = Math.abs(x - ox);
        let dy = Math.abs(y - oy);

        // Toroidal distance (wrapping)
        if (dx > width / 2) dx = width - dx;
        if (dy > height / 2) dy = height - dy;

        if (dx < radius && dy < radius) {
          energy[i] += gaussianWeight(dx, dy);
        }
      }
    }

    // Find pixel with maximum energy (largest cluster)
    let maxEnergy = -Infinity;
    let maxIndex = 0;
    for (let i = 0; i < size; i++) {
      if (binary[i] && energy[i] > maxEnergy) {
        maxEnergy = energy[i];
        maxIndex = i;
      }
    }

    return maxIndex;
  };

  // Phase 1: Remove pixels from clusters
  let filled = binary.filter(b => b).length;
  while (filled > 0) {
    const index = findLargestCluster();
    binary[index] = false;
    order.unshift(index); // Add to beginning
    filled--;

    // Progress reporting (optional)
    if (filled % 100 === 0) {
      // Could emit progress event here
    }
  }

  // Phase 2: Add pixels to voids
  let empty = size - binary.filter(b => b).length;
  while (empty > 0) {
    const index = findLargestVoid();
    binary[index] = true;
    order.push(index); // Add to end
    empty--;

    // Progress reporting (optional)
    if (empty % 100 === 0) {
      // Could emit progress event here
    }
  }

  // Assign values based on order
  for (let i = 0; i < size; i++) {
    values[order[i]] = i / (size - 1);
  }

  // Convert to 2D array
  const result: number[][] = Array(width)
    .fill(null)
    .map(() => Array(height).fill(0));

  for (let i = 0; i < size; i++) {
    const x = i % width;
    const y = Math.floor(i / width);
    result[x][y] = values[i];
  }

  return result;
}

/**
 * Fast approximation of blue noise using Poisson disc sampling
 *
 * Much faster than void-and-cluster but less accurate.
 * Good enough for most game use cases.
 *
 * @param width - Width of the texture
 * @param height - Height of the texture
 * @param density - Point density (0-1, default: 0.3)
 * @param seed - Random seed
 * @returns 2D array of noise values (0-1)
 */
export function fastBlueNoise(
  width: number,
  height: number,
  density: number = 0.3,
  seed?: number
): number[][] {
  const random = new SeededRandom(seed);

  // Calculate minimum distance based on density
  const area = width * height;
  const targetPoints = area * density;
  const minDistance = Math.sqrt(area / targetPoints) * 0.8;

  // Generate points using Poisson disc sampling
  const points = poissonDiscSampling(width, height, minDistance, 30, seed);

  // Create texture
  const texture: number[][] = Array(width)
    .fill(null)
    .map(() => Array(height).fill(0));

  // Assign random values to points and interpolate
  const radius = minDistance * 1.5;

  for (const point of points) {
    const value = random.next();
    const px = Math.floor(point.x);
    const py = Math.floor(point.y);

    // Splat the value in a radius around the point
    for (let x = Math.max(0, px - Math.floor(radius)); x < Math.min(width, px + Math.ceil(radius)); x++) {
      for (let y = Math.max(0, py - Math.floor(radius)); y < Math.min(height, py + Math.ceil(radius)); y++) {
        const dx = x - point.x;
        const dy = y - point.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < radius) {
          const weight = 1 - (dist / radius);
          texture[x][y] = Math.max(texture[x][y], value * weight);
        }
      }
    }
  }

  return texture;
}

/**
 * Sample points from a blue noise texture
 *
 * Uses a blue noise texture to determine where to place points.
 * Points are placed where the noise value is above a threshold.
 *
 * @param noiseTexture - Blue noise texture (2D array)
 * @param threshold - Value threshold (0-1)
 * @param jitter - Random position jitter (0-1, default: 0.5)
 * @param seed - Random seed
 * @returns Array of points
 */
export function sampleFromBlueNoise(
  noiseTexture: number[][],
  threshold: number = 0.5,
  jitter: number = 0.5,
  seed?: number
): Point2D[] {
  const random = new SeededRandom(seed);
  const points: Point2D[] = [];
  const width = noiseTexture.length;
  const height = noiseTexture[0].length;

  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      if (noiseTexture[x][y] > threshold) {
        points.push({
          x: x + random.nextRange(-jitter, jitter),
          y: y + random.nextRange(-jitter, jitter),
        });
      }
    }
  }

  return points;
}

/**
 * Create a tileable blue noise texture
 *
 * Ensures the texture wraps seamlessly by using toroidal distance.
 *
 * @param size - Size of the square texture
 * @param minDistance - Minimum distance between points
 * @param seed - Random seed
 * @returns Array of points
 */
export function tileableBlueNoise(size: number, minDistance: number, seed?: number): Point2D[] {
  const random = new SeededRandom(seed);
  const points: Point2D[] = [];
  const cellSize = minDistance / Math.SQRT2;
  const gridSize = Math.ceil(size / cellSize);

  const grid: (number | null)[][] = Array(gridSize)
    .fill(null)
    .map(() => Array(gridSize).fill(null));

  const getGridCoords = (p: Point2D): [number, number] => {
    const gx = Math.floor(p.x / cellSize);
    const gy = Math.floor(p.y / cellSize);
    return [
      ((gx % gridSize) + gridSize) % gridSize,
      ((gy % gridSize) + gridSize) % gridSize,
    ];
  };

  const toroidalDistance = (p1: Point2D, p2: Point2D): number => {
    let dx = Math.abs(p1.x - p2.x);
    let dy = Math.abs(p1.y - p2.y);
    if (dx > size / 2) dx = size - dx;
    if (dy > size / 2) dy = size - dy;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const isValidPoint = (p: Point2D): boolean => {
    const [gridX, gridY] = getGridCoords(p);

    for (let x = -2; x <= 2; x++) {
      for (let y = -2; y <= 2; y++) {
        const gx = ((gridX + x) % gridSize + gridSize) % gridSize;
        const gy = ((gridY + y) % gridSize + gridSize) % gridSize;
        const pointIndex = grid[gx][gy];

        if (pointIndex !== null) {
          const dist = toroidalDistance(p, points[pointIndex]);
          if (dist < minDistance) {
            return false;
          }
        }
      }
    }

    return true;
  };

  const addPoint = (p: Point2D): void => {
    const index = points.length;
    points.push(p);
    const [gridX, gridY] = getGridCoords(p);
    grid[gridX][gridY] = index;
  };

  const activeList: number[] = [];

  // Initial point
  const initial: Point2D = {
    x: random.nextRange(0, size),
    y: random.nextRange(0, size),
  };
  addPoint(initial);
  activeList.push(0);

  while (activeList.length > 0) {
    const activeIndex = random.nextInt(0, activeList.length);
    const pointIndex = activeList[activeIndex];
    const point = points[pointIndex];

    let foundValid = false;

    for (let i = 0; i < 30; i++) {
      const angle = random.next() * Math.PI * 2;
      const radius = random.nextRange(minDistance, minDistance * 2);

      let newPoint: Point2D = {
        x: point.x + Math.cos(angle) * radius,
        y: point.y + Math.sin(angle) * radius,
      };

      // Wrap coordinates
      newPoint.x = ((newPoint.x % size) + size) % size;
      newPoint.y = ((newPoint.y % size) + size) % size;

      if (isValidPoint(newPoint)) {
        addPoint(newPoint);
        activeList.push(points.length - 1);
        foundValid = true;
        break;
      }
    }

    if (!foundValid) {
      activeList.splice(activeIndex, 1);
    }
  }

  return points;
}

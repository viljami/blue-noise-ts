# Blue Noise Library

A TypeScript library for generating blue noise patterns and Poisson disc sampling for evenly distributed point placement in procedural generation.

## Overview

Blue noise is a type of noise that has even distribution without clumping or regular patterns. It's perfect for:

- Placing trees, rocks, and other objects naturally
- Dithering and anti-aliasing
- Sampling patterns
- Particle spawn positions
- Any situation where you want random but evenly spaced placement

## What is Blue Noise?

Unlike white noise (completely random, tends to clump), blue noise maintains a minimum distance between samples while still appearing random. This creates natural-looking distributions without visible patterns.

## Installation

This is a standalone TypeScript module with no external dependencies.

## API Reference

### Poisson Disc Sampling

The fastest and most commonly used method for game development.

#### `poissonDiscSampling(width, height, minDistance, maxAttempts?, seed?)`

Generates evenly distributed points using Bridson's algorithm.

**Parameters:**

- `width: number` - Width of the sampling area
- `height: number` - Height of the sampling area
- `minDistance: number` - Minimum distance between points
- `maxAttempts: number` - Maximum attempts per point (default: 30)
- `seed: number` - Random seed for reproducibility (optional)

**Returns:** `Point2D[]` - Array of `{x, y}` points

**Example:**

```typescript
import { poissonDiscSampling } from "blue-noise-ts";

// Place trees in a 1000x1000 area with minimum 30 units apart
const treePositions = poissonDiscSampling(1000, 1000, 30);

treePositions.forEach((pos) => {
  placeTree(pos.x, pos.y);
});
```

### Blue Noise Texture Generation

#### `generateBlueNoise(width, height, seed?)`

Generates a high-quality blue noise texture using the void-and-cluster method.

**Warning:** This is computationally expensive! Use for offline generation only.

**Parameters:**

- `width: number` - Texture width
- `height: number` - Texture height
- `seed: number` - Random seed (optional)

**Returns:** `number[][]` - 2D array of values (0-1)

**Example:**

```typescript
import { generateBlueNoise } from "blue-noise-ts";

// Generate a 256x256 blue noise texture
const noise = generateBlueNoise(256, 256);

// Use for dithering
const ditherThreshold = noise[x % 256][y % 256];
if (grayValue > ditherThreshold) {
  setPixel(x, y, "white");
}
```

#### `fastBlueNoise(width, height, density?, seed?)`

Fast approximation of blue noise using Poisson disc sampling.

**Parameters:**

- `width: number` - Texture width
- `height: number` - Texture height
- `density: number` - Point density 0-1 (default: 0.3)
- `seed: number` - Random seed (optional)

**Returns:** `number[][]` - 2D array of values (0-1)

**Example:**

```typescript
import { fastBlueNoise } from "blue-noise-ts";

// Quick blue noise for real-time use
const noise = fastBlueNoise(512, 512, 0.5);
```

### Sampling and Utilities

#### `sampleFromBlueNoise(noiseTexture, threshold?, jitter?, seed?)`

Extract points from a blue noise texture.

**Parameters:**

- `noiseTexture: number[][]` - Blue noise texture
- `threshold: number` - Value threshold 0-1 (default: 0.5)
- `jitter: number` - Position randomization 0-1 (default: 0.5)
- `seed: number` - Random seed (optional)

**Returns:** `Point2D[]`

#### `tileableBlueNoise(size, minDistance, seed?)`

Generates a tileable/wrapping blue noise pattern.

**Parameters:**

- `size: number` - Size of square texture
- `minDistance: number` - Minimum distance between points
- `seed: number` - Random seed (optional)

**Returns:** `Point2D[]`

## Practical Examples

### Tree Placement in a Forest

```typescript
import { poissonDiscSampling } from "blue-noise-ts";

function generateForest(mapWidth: number, mapHeight: number) {
  // Dense forest: trees every 15-20 units
  const treePositions = poissonDiscSampling(mapWidth, mapHeight, 18);

  treePositions.forEach((pos) => {
    const treeType = Math.random() > 0.7 ? "pine" : "oak";
    spawnTree(pos.x, pos.y, treeType);
  });
}
```

### Rock Scatter with Varying Density

```typescript
import { poissonDiscSampling } from "blue-noise-ts";
import { createNoise2D } from "simplex-noise";

function generateRocks(mapWidth: number, mapHeight: number) {
  const noise2D = createNoise2D();

  // Generate potential positions
  const positions = poissonDiscSampling(mapWidth, mapHeight, 25);

  // Filter based on terrain
  const rockPositions = positions.filter((pos) => {
    const terrainValue = noise2D(pos.x * 0.01, pos.y * 0.01);
    // More rocks in mountainous areas
    return terrainValue > 0.3;
  });

  rockPositions.forEach((pos) => spawnRock(pos.x, pos.y));
}
```

### Particle System Spawn

```typescript
import { poissonDiscSampling } from "blue-noise-ts";

function createFireworkExplosion(centerX: number, centerY: number) {
  const radius = 100;

  // Generate points in a circle
  const points = poissonDiscSampling(radius * 2, radius * 2, 5);

  points.forEach((p) => {
    const dx = p.x - radius;
    const dy = p.y - radius;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Only use points within circle
    if (distance < radius) {
      spawnParticle(
        centerX + dx,
        centerY + dy,
        dx / distance, // velocity x
        dy / distance, // velocity y
      );
    }
  });
}
```

### Dithering with Blue Noise

```typescript
import { fastBlueNoise } from "blue-noise-ts";

// Generate once at startup
const ditherTexture = fastBlueNoise(64, 64);

function ditherImage(imageData: ImageData) {
  for (let y = 0; y < imageData.height; y++) {
    for (let x = 0; x < imageData.width; x++) {
      const idx = (y * imageData.width + x) * 4;

      // Get grayscale value
      const gray =
        (imageData.data[idx] +
          imageData.data[idx + 1] +
          imageData.data[idx + 2]) /
        3;

      // Compare with blue noise threshold
      const threshold = ditherTexture[x % 64][y % 64] * 255;
      const output = gray > threshold ? 255 : 0;

      // Set pixel
      imageData.data[idx] = output;
      imageData.data[idx + 1] = output;
      imageData.data[idx + 2] = output;
    }
  }
}
```

### Tileable Texture for Looping Levels

```typescript
import { tileableBlueNoise } from "blue-noise-ts";

// Generate tileable pattern for infinite scrolling
const pattern = tileableBlueNoise(512, 30);

// Can be repeated infinitely without visible seams
function getObjectPosition(worldX: number, worldY: number) {
  const tileSize = 512;
  const localX = ((worldX % tileSize) + tileSize) % tileSize;
  const localY = ((worldY % tileSize) + tileSize) % tileSize;

  // Find nearest point in pattern
  // ... use pattern points ...
}
```

### Star Field Generation

```typescript
import { poissonDiscSampling } from "blue-noise-ts";

function generateStarField(width: number, height: number) {
  // Different layers for parallax
  const backgroundStars = poissonDiscSampling(width, height, 50, 30, 1);
  const midgroundStars = poissonDiscSampling(width, height, 30, 30, 2);
  const foregroundStars = poissonDiscSampling(width, height, 20, 30, 3);

  // Render with different sizes and speeds
  backgroundStars.forEach((p) => drawStar(p.x, p.y, 1, 0.1));
  midgroundStars.forEach((p) => drawStar(p.x, p.y, 2, 0.3));
  foregroundStars.forEach((p) => drawStar(p.x, p.y, 3, 0.5));
}
```

### Biome-Based Object Placement

```typescript
import { poissonDiscSampling } from "blue-noise-ts";
import { createNoise2D } from "simplex-noise";

interface BiomeConfig {
  minDistance: number;
  density: number;
}

const biomeConfigs: Record<string, BiomeConfig> = {
  forest: { minDistance: 15, density: 1.0 },
  plains: { minDistance: 40, density: 0.3 },
  desert: { minDistance: 60, density: 0.1 },
};

function placeObjectsInBiome(
  biome: string,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const config = biomeConfigs[biome];
  const points = poissonDiscSampling(width, height, config.minDistance);

  // Filter by density
  const filtered = points.filter(() => Math.random() < config.density);

  filtered.forEach((p) => {
    placeObject(x + p.x, y + p.y, biome);
  });
}
```

## Performance Comparison

| Method                | Size      | Time  | Use Case                     |
| --------------------- | --------- | ----- | ---------------------------- |
| `poissonDiscSampling` | 1000x1000 | ~10ms | Real-time object placement   |
| `fastBlueNoise`       | 512x512   | ~50ms | Real-time texture generation |
| `generateBlueNoise`   | 256x256   | ~10s  | Offline/precomputed textures |
| `tileableBlueNoise`   | 512x512   | ~20ms | Seamless patterns            |

## Tips and Best Practices

### 1. Choose the Right Method

- **Need points?** → Use `poissonDiscSampling`
- **Need a texture?** → Use `fastBlueNoise`
- **Need highest quality?** → Pre-generate with `generateBlueNoise`
- **Need seamless wrapping?** → Use `tileableBlueNoise`

### 2. Minimum Distance Guidelines

```typescript
// Very dense (grass clumps, small details)
const dense = poissonDiscSampling(w, h, 5);

// Medium density (trees, rocks)
const medium = poissonDiscSampling(w, h, 25);

// Sparse (large landmarks, bosses)
const sparse = poissonDiscSampling(w, h, 100);
```

### 3. Layered Placement

Combine multiple passes for natural variety:

```typescript
// Large trees
const largeTrees = poissonDiscSampling(w, h, 50, 30, 1);

// Small trees (different seed)
const smallTrees = poissonDiscSampling(w, h, 25, 30, 2);

// Bushes (different seed)
const bushes = poissonDiscSampling(w, h, 15, 30, 3);
```

### 4. Seeded Generation

Always use seeds for reproducible worlds:

```typescript
function generateLevel(levelNumber: number) {
  const seed = levelNumber * 12345;
  const objects = poissonDiscSampling(1000, 1000, 30, 30, seed);
  // Same seed always generates same layout
}
```

### 5. Performance Optimization

```typescript
// Pre-generate and cache
const cachedPoints = poissonDiscSampling(1000, 1000, 30);

// Reuse for multiple object types
cachedPoints.slice(0, 50).forEach((p) => placeTree(p.x, p.y));
cachedPoints.slice(50, 100).forEach((p) => placeRock(p.x, p.y));
```

### 6. Density Masking

Use noise or other maps to vary density:

```typescript
const allPoints = poissonDiscSampling(w, h, 20);
const filtered = allPoints.filter((p) => {
  return densityMap[Math.floor(p.x)][Math.floor(p.y)] > 0.5;
});
```

## Algorithm Details

### Poisson Disc Sampling (Bridson's Algorithm)

1. Start with a random point
2. Add it to an "active list"
3. While the active list isn't empty:
   - Pick a random point from the active list
   - Try to generate new points around it (within minDistance to 2\*minDistance)
   - If a valid point is found, add it to the list
   - If no valid points found after maxAttempts, remove from active list
4. Result: evenly distributed points

**Complexity:** O(n) where n is the number of points generated

### Void-and-Cluster Method

High-quality blue noise generation:

1. Start with random binary pattern
2. Find largest cluster, remove a pixel
3. Repeat until all pixels removed
4. Find largest void, add a pixel
5. Repeat until all pixels added
6. The order of removal/addition creates the blue noise pattern

**Complexity:** O(n²) - very slow, use for pre-generation only

## Common Gotchas

### 1. Too Small minDistance

```typescript
// Bad: minDistance too small = too many points = slow
const points = poissonDiscSampling(10000, 10000, 1); // 100M checks!

// Good: Reasonable density
const points = poissonDiscSampling(10000, 10000, 25); // ~160k points
```

### 2. Forgetting to Seed

```typescript
// Bad: Different every time
const points = poissonDiscSampling(w, h, 30);

// Good: Reproducible
const points = poissonDiscSampling(w, h, 30, 30, worldSeed);
```

### 3. Generating Every Frame

```typescript
// Bad: Generating 60 times per second!
function render() {
  const points = poissonDiscSampling(w, h, 30);
  points.forEach(drawStar);
}

// Good: Generate once
const stars = poissonDiscSampling(w, h, 30);
function render() {
  stars.forEach(drawStar);
}
```

## TypeScript Types

```typescript
interface Point2D {
  x: number;
  y: number;
}

interface PoissonDiscOptions {
  minDistance: number;
  maxAttempts?: number;
  seed?: number;
}

interface BlueNoiseOptions {
  width: number;
  height: number;
  seed?: number;
}
```

## License

MIT

## References

- [Fast Poisson Disk Sampling in Arbitrary Dimensions](https://www.cs.ubc.ca/~rbridson/docs/bridson-siggraph07-poissondisk.pdf) - Bridson
- [Void-and-Cluster Method](http://cv.ulichney.com/papers/1993-void-cluster.pdf) - Ulichney
- [Blue Noise Textures](https://blog.demofox.org/2018/01/30/what-the-heck-is-blue-noise/)

## Testing

This library includes a comprehensive test suite using Vitest.

### Running Tests

```bash
# Install dependencies
npm install

# Run tests once
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage
```

### Test Coverage

The test suite covers:

- **Poisson disc sampling**
  - Distance constraints
  - Boundary conditions
  - Deterministic seeding
  - Spatial distribution
  - Performance characteristics

- **Blue noise generation**
  - Texture generation (void-and-cluster)
  - Fast approximation
  - Value ranges and distribution
  - Deterministic behavior

- **Sampling utilities**
  - Threshold-based sampling
  - Jitter application
  - Tileable patterns
  - Edge wrapping

- **Integration tests**
  - Complete workflows
  - Game-like scenarios
  - Layered placement
  - Statistical properties

### Writing Tests

Tests are located in `src/__tests__/`. To add new tests:

```typescript
import { describe, it, expect } from "vitest";
import { poissonDiscSampling } from ".blue-noise-ts";

describe("My Feature", () => {
  it("should work correctly", () => {
    const points = poissonDiscSampling(100, 100, 15, 30, 12345);
    expect(points.length).toBeGreaterThan(0);
  });
});
```

### Running Specific Tests

```bash
# Run only Poisson disc tests
npx vitest run -t "poissonDiscSampling"

# Run tests in a specific file
npx vitest run src/__tests__/blue-noise.test.ts
```

---

## See Also

- Parent engine library with other noise types
- `simplex-noise` for terrain generation
- `@leodeslf/worley-noise` for cellular patterns

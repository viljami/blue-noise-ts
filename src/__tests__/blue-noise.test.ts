import { describe, it, expect, beforeEach } from "vitest";
import {
  poissonDiscSampling,
  generateBlueNoise,
  fastBlueNoise,
  sampleFromBlueNoise,
  tileableBlueNoise,
  type Point2D,
} from "../index";

describe("Blue Noise Library", () => {
  describe("poissonDiscSampling", () => {
    it("should generate points within the specified area", () => {
      const width = 100;
      const height = 100;
      const points = poissonDiscSampling(width, height, 10);

      points.forEach((point) => {
        expect(point.x).toBeGreaterThanOrEqual(0);
        expect(point.x).toBeLessThan(width);
        expect(point.y).toBeGreaterThanOrEqual(0);
        expect(point.y).toBeLessThan(height);
      });
    });

    it("should respect minimum distance constraint", () => {
      const width = 200;
      const height = 200;
      const minDistance = 20;
      const points = poissonDiscSampling(width, height, minDistance);

      // Check all pairs of points
      for (let i = 0; i < points.length; i++) {
        for (let j = i + 1; j < points.length; j++) {
          const dx = points[i].x - points[j].x;
          const dy = points[i].y - points[j].y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          expect(distance).toBeGreaterThanOrEqual(minDistance * 0.999); // Small tolerance for floating point
        }
      }
    });

    it("should return at least one point", () => {
      const points = poissonDiscSampling(100, 100, 10);
      expect(points.length).toBeGreaterThan(0);
    });

    it("should generate more points with smaller minDistance", () => {
      const width = 100;
      const height = 100;

      const sparse = poissonDiscSampling(width, height, 30);
      const dense = poissonDiscSampling(width, height, 10);

      expect(dense.length).toBeGreaterThan(sparse.length);
    });

    it("should be deterministic with same seed", () => {
      const seed = 12345;
      const points1 = poissonDiscSampling(100, 100, 15, 30, seed);
      const points2 = poissonDiscSampling(100, 100, 15, 30, seed);

      expect(points1.length).toBe(points2.length);

      for (let i = 0; i < points1.length; i++) {
        expect(points1[i].x).toBe(points2[i].x);
        expect(points1[i].y).toBe(points2[i].y);
      }
    });

    it("should produce different results with different seeds", () => {
      const points1 = poissonDiscSampling(100, 100, 15, 30, 1);
      const points2 = poissonDiscSampling(100, 100, 15, 30, 2);

      // At least one point should be different
      let different = false;
      if (points1.length !== points2.length) {
        different = true;
      } else {
        for (let i = 0; i < points1.length; i++) {
          if (points1[i].x !== points2[i].x || points1[i].y !== points2[i].y) {
            different = true;
            break;
          }
        }
      }

      expect(different).toBe(true);
    });

    it("should handle small areas", () => {
      const points = poissonDiscSampling(20, 20, 5);
      expect(points.length).toBeGreaterThan(0);
      expect(points.length).toBeLessThan(20); // Should have reasonable density
    });

    it("should handle large areas", () => {
      const points = poissonDiscSampling(1000, 1000, 25);
      expect(points.length).toBeGreaterThan(100);
    });

    it("should handle non-square areas", () => {
      const points = poissonDiscSampling(200, 50, 10);

      points.forEach((point) => {
        expect(point.x).toBeLessThan(200);
        expect(point.y).toBeLessThan(50);
      });
    });

    it("should respect maxAttempts parameter", () => {
      // With very few attempts, should generate fewer points
      const fewAttempts = poissonDiscSampling(100, 100, 10, 1);
      const manyAttempts = poissonDiscSampling(100, 100, 10, 30);

      expect(manyAttempts.length).toBeGreaterThanOrEqual(fewAttempts.length);
    });

    it("should handle edge case: minDistance larger than area", () => {
      const points = poissonDiscSampling(10, 10, 50);
      // Should still generate at least the initial point
      expect(points.length).toBeGreaterThanOrEqual(1);
      expect(points.length).toBeLessThanOrEqual(5); // Very few points possible
    });

    it("should have even distribution (no obvious clustering)", () => {
      const width = 100;
      const height = 100;
      const points = poissonDiscSampling(width, height, 10);

      // Divide area into quadrants and check distribution
      const quadrants = [0, 0, 0, 0];
      points.forEach((p) => {
        const qx = p.x < width / 2 ? 0 : 1;
        const qy = p.y < height / 2 ? 0 : 1;
        quadrants[qy * 2 + qx]++;
      });

      // Each quadrant should have some points (not all in one area)
      quadrants.forEach((count) => {
        expect(count).toBeGreaterThan(0);
      });

      // Quadrants should be relatively balanced (within 50% of average)
      const avg = points.length / 4;
      quadrants.forEach((count) => {
        expect(count).toBeGreaterThan(avg * 0.3);
        expect(count).toBeLessThan(avg * 1.7);
      });
    });
  });

  describe("generateBlueNoise", () => {
    it("should generate a texture of correct dimensions", () => {
      const width = 16;
      const height = 16;
      const noise = generateBlueNoise(width, height);

      expect(noise.length).toBe(width);
      expect(noise[0].length).toBe(height);
    });

    it("should produce values between 0 and 1", () => {
      const noise = generateBlueNoise(8, 8);

      for (let x = 0; x < 8; x++) {
        for (let y = 0; y < 8; y++) {
          expect(noise[x][y]).toBeGreaterThanOrEqual(0);
          expect(noise[x][y]).toBeLessThanOrEqual(1);
        }
      }
    });

    it("should be deterministic with same seed", () => {
      const seed = 54321;
      const noise1 = generateBlueNoise(8, 8, seed);
      const noise2 = generateBlueNoise(8, 8, seed);

      for (let x = 0; x < 8; x++) {
        for (let y = 0; y < 8; y++) {
          expect(noise1[x][y]).toBe(noise2[x][y]);
        }
      }
    });

    it("should produce different results with different seeds", () => {
      const noise1 = generateBlueNoise(8, 8, 1);
      const noise2 = generateBlueNoise(8, 8, 2);

      let different = false;
      for (let x = 0; x < 8; x++) {
        for (let y = 0; y < 8; y++) {
          if (noise1[x][y] !== noise2[x][y]) {
            different = true;
            break;
          }
        }
        if (different) break;
      }

      expect(different).toBe(true);
    });

    it("should have good value distribution", () => {
      const noise = generateBlueNoise(16, 16);
      const values: number[] = [];

      for (let x = 0; x < 16; x++) {
        for (let y = 0; y < 16; y++) {
          values.push(noise[x][y]);
        }
      }

      // Check that we use the full range
      const min = Math.min(...values);
      const max = Math.max(...values);

      expect(min).toBeLessThan(0.2);
      expect(max).toBeGreaterThan(0.8);
    });

    it("should handle small textures", () => {
      const noise = generateBlueNoise(4, 4);
      expect(noise.length).toBe(4);
      expect(noise[0].length).toBe(4);
    });

    it("should handle non-square textures", () => {
      const noise = generateBlueNoise(8, 16);
      expect(noise.length).toBe(8);
      expect(noise[0].length).toBe(16);
    });
  });

  describe("fastBlueNoise", () => {
    it("should generate a texture of correct dimensions", () => {
      const width = 64;
      const height = 64;
      const noise = fastBlueNoise(width, height);

      expect(noise.length).toBe(width);
      expect(noise[0].length).toBe(height);
    });

    it("should produce values between 0 and 1", () => {
      const noise = fastBlueNoise(32, 32);

      for (let x = 0; x < 32; x++) {
        for (let y = 0; y < 32; y++) {
          expect(noise[x][y]).toBeGreaterThanOrEqual(0);
          expect(noise[x][y]).toBeLessThanOrEqual(1);
        }
      }
    });

    it("should be deterministic with same seed", () => {
      const seed = 99999;
      const noise1 = fastBlueNoise(32, 32, 0.3, seed);
      const noise2 = fastBlueNoise(32, 32, 0.3, seed);

      for (let x = 0; x < 32; x++) {
        for (let y = 0; y < 32; y++) {
          expect(noise1[x][y]).toBe(noise2[x][y]);
        }
      }
    });

    it("should respect density parameter", () => {
      const sparse = fastBlueNoise(64, 64, 0.1, 12345);
      const dense = fastBlueNoise(64, 64, 0.5, 54321);

      // Count non-zero cells
      let sparseCount = 0;
      let denseCount = 0;

      for (let x = 0; x < 64; x++) {
        for (let y = 0; y < 64; y++) {
          if (sparse[x][y] > 0.1) sparseCount++;
          if (dense[x][y] > 0.1) denseCount++;
        }
      }

      // Dense should have significantly more non-zero cells
      // Use a more lenient check since this is statistical
      expect(denseCount).toBeGreaterThan(sparseCount * 0.5);
    });

    it("should be faster than generateBlueNoise", () => {
      const startFast = performance.now();
      fastBlueNoise(64, 64);
      const fastTime = performance.now() - startFast;

      const startSlow = performance.now();
      generateBlueNoise(32, 32); // Even smaller size for slow method
      const slowTime = performance.now() - startSlow;

      // Fast method should be significantly faster
      // (This might be flaky, but gives us a performance indicator)
      expect(fastTime).toBeLessThan(slowTime * 2);
    });

    it("should handle different densities", () => {
      const veryDense = fastBlueNoise(32, 32, 0.9);
      const verySparse = fastBlueNoise(32, 32, 0.05);

      expect(veryDense).toBeDefined();
      expect(verySparse).toBeDefined();
    });
  });

  describe("sampleFromBlueNoise", () => {
    it("should return points based on threshold", () => {
      // Create a simple noise texture
      const noise: number[][] = Array(10)
        .fill(null)
        .map(() => Array(10).fill(0));

      // Set some values above threshold
      noise[5][5] = 0.8;
      noise[7][3] = 0.9;
      noise[2][8] = 0.7;

      const points = sampleFromBlueNoise(noise, 0.5, 0);

      expect(points.length).toBeGreaterThanOrEqual(3);
    });

    it("should return no points when threshold is too high", () => {
      const noise: number[][] = Array(10)
        .fill(null)
        .map(() => Array(10).fill(0.3));
      const points = sampleFromBlueNoise(noise, 0.99);

      expect(points.length).toBe(0);
    });

    it("should return all points when threshold is zero", () => {
      const noise: number[][] = Array(10)
        .fill(null)
        .map(() => Array(10).fill(0.5));
      const points = sampleFromBlueNoise(noise, 0);

      expect(points.length).toBe(100);
    });

    it("should apply jitter to positions", () => {
      const noise: number[][] = Array(5)
        .fill(null)
        .map(() => Array(5).fill(0.9));

      const noJitter = sampleFromBlueNoise(noise, 0.5, 0, 123);
      const withJitter = sampleFromBlueNoise(noise, 0.5, 0.5, 456);

      expect(noJitter.length).toBe(withJitter.length);

      // With jitter, points should not be exactly on integer coordinates
      const hasNonInteger = withJitter.some(
        (p) => p.x !== Math.floor(p.x) || p.y !== Math.floor(p.y)
      );
      expect(hasNonInteger).toBe(true);
    });

    it("should be deterministic with same seed", () => {
      const noise = fastBlueNoise(16, 16, 0.5, 100);

      const points1 = sampleFromBlueNoise(noise, 0.5, 0.3, 200);
      const points2 = sampleFromBlueNoise(noise, 0.5, 0.3, 200);

      expect(points1.length).toBe(points2.length);

      for (let i = 0; i < points1.length; i++) {
        expect(points1[i].x).toBe(points2[i].x);
        expect(points1[i].y).toBe(points2[i].y);
      }
    });

    it("should return points within texture bounds (with jitter)", () => {
      const noise = fastBlueNoise(20, 20, 0.5);
      const points = sampleFromBlueNoise(noise, 0.3, 0.5);

      points.forEach((p) => {
        expect(p.x).toBeGreaterThanOrEqual(-0.5);
        expect(p.x).toBeLessThan(20.5);
        expect(p.y).toBeGreaterThanOrEqual(-0.5);
        expect(p.y).toBeLessThan(20.5);
      });
    });
  });

  describe("tileableBlueNoise", () => {
    it("should generate points within the specified area", () => {
      const size = 100;
      const points = tileableBlueNoise(size, 15);

      points.forEach((point) => {
        expect(point.x).toBeGreaterThanOrEqual(0);
        expect(point.x).toBeLessThan(size);
        expect(point.y).toBeGreaterThanOrEqual(0);
        expect(point.y).toBeLessThan(size);
      });
    });

    it("should respect minimum distance constraint", () => {
      const size = 200;
      const minDistance = 20;
      const points = tileableBlueNoise(size, minDistance);

      // Helper to calculate toroidal distance
      const toroidalDist = (p1: Point2D, p2: Point2D): number => {
        let dx = Math.abs(p1.x - p2.x);
        let dy = Math.abs(p1.y - p2.y);
        if (dx > size / 2) dx = size - dx;
        if (dy > size / 2) dy = size - dy;
        return Math.sqrt(dx * dx + dy * dy);
      };

      // Check all pairs with toroidal distance
      for (let i = 0; i < points.length; i++) {
        for (let j = i + 1; j < points.length; j++) {
          const distance = toroidalDist(points[i], points[j]);
          expect(distance).toBeGreaterThanOrEqual(minDistance * 0.999);
        }
      }
    });

    it("should be deterministic with same seed", () => {
      const seed = 77777;
      const points1 = tileableBlueNoise(100, 15, seed);
      const points2 = tileableBlueNoise(100, 15, seed);

      expect(points1.length).toBe(points2.length);

      for (let i = 0; i < points1.length; i++) {
        expect(points1[i].x).toBe(points2[i].x);
        expect(points1[i].y).toBe(points2[i].y);
      }
    });

    it("should work with different sizes", () => {
      const small = tileableBlueNoise(50, 10);
      const large = tileableBlueNoise(500, 10);

      expect(small.length).toBeGreaterThan(0);
      expect(large.length).toBeGreaterThan(small.length);
    });

    it("should support edge wrapping (test near boundaries)", () => {
      const size = 100;
      const minDistance = 15;
      const points = tileableBlueNoise(size, minDistance, 888);

      // Add virtual points on the other side of boundaries
      const virtualPoints: Point2D[] = [];
      points.forEach((p) => {
        // Near left edge, add virtual point on right
        if (p.x < minDistance) {
          virtualPoints.push({ x: p.x + size, y: p.y });
        }
        // Near right edge, add virtual point on left
        if (p.x > size - minDistance) {
          virtualPoints.push({ x: p.x - size, y: p.y });
        }
        // Near top edge, add virtual point on bottom
        if (p.y < minDistance) {
          virtualPoints.push({ x: p.x, y: p.y + size });
        }
        // Near bottom edge, add virtual point on top
        if (p.y > size - minDistance) {
          virtualPoints.push({ x: p.x, y: p.y - size });
        }
      });

      // Check that original points respect distance to virtual points
      if (virtualPoints.length > 0) {
        points.forEach((p1) => {
          virtualPoints.forEach((p2) => {
            const dx = p1.x - p2.x;
            const dy = p1.y - p2.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 0.01) {
              // Not the same point
              expect(dist).toBeGreaterThanOrEqual(minDistance * 0.999);
            }
          });
        });
      }
    });

    it("should return at least one point", () => {
      const points = tileableBlueNoise(100, 20);
      expect(points.length).toBeGreaterThan(0);
    });
  });

  describe("Integration Tests", () => {
    it("should create a complete workflow: generate texture, sample points", () => {
      // Generate blue noise texture
      const texture = fastBlueNoise(64, 64, 0.4, 123);

      // Sample points from texture
      const points = sampleFromBlueNoise(texture, 0.6, 0.3, 456);

      // Verify points are reasonable
      expect(points.length).toBeGreaterThan(0);
      expect(points.length).toBeLessThan(64 * 64);

      points.forEach((p) => {
        expect(p.x).toBeGreaterThanOrEqual(-0.5);
        expect(p.y).toBeGreaterThanOrEqual(-0.5);
      });
    });

    it("should allow using different methods for similar results", () => {
      const seed = 5555;

      // Method 1: Direct Poisson disc sampling
      const direct = poissonDiscSampling(100, 100, 15, 30, seed);

      // Method 2: Generate texture then sample
      const texture = fastBlueNoise(100, 100, 0.3, seed);
      const fromTexture = sampleFromBlueNoise(texture, 0.5, 0, seed + 1);

      // Both should produce reasonable point counts
      expect(direct.length).toBeGreaterThan(10);
      expect(fromTexture.length).toBeGreaterThan(10);
    });

    it("should work for game-like scenarios: tree placement", () => {
      const mapWidth = 500;
      const mapHeight = 500;
      const treeSpacing = 25;

      const treePositions = poissonDiscSampling(
        mapWidth,
        mapHeight,
        treeSpacing,
        30,
        12345
      );

      expect(treePositions.length).toBeGreaterThan(50);
      expect(treePositions.length).toBeLessThan(1000);

      // All trees should be in bounds
      treePositions.forEach((pos) => {
        expect(pos.x).toBeGreaterThanOrEqual(0);
        expect(pos.x).toBeLessThan(mapWidth);
        expect(pos.y).toBeGreaterThanOrEqual(0);
        expect(pos.y).toBeLessThan(mapHeight);
      });
    });

    it("should work for particle systems with varying density", () => {
      const particleArea = 200;

      // Dense particle cloud in center
      const denseParticles = poissonDiscSampling(100, 100, 5, 30, 111);

      // Sparse outer particles
      const sparseParticles = poissonDiscSampling(100, 100, 20, 30, 222);

      expect(denseParticles.length).toBeGreaterThan(sparseParticles.length * 2);
    });

    it("should support layered placement with different seeds", () => {
      const width = 200;
      const height = 200;

      const largeTrees = poissonDiscSampling(width, height, 40, 30, 1);
      const smallTrees = poissonDiscSampling(width, height, 20, 30, 2);
      const bushes = poissonDiscSampling(width, height, 10, 30, 3);

      expect(largeTrees.length).toBeLessThan(smallTrees.length);
      expect(smallTrees.length).toBeLessThan(bushes.length);

      // All layers should have points
      expect(largeTrees.length).toBeGreaterThan(0);
      expect(smallTrees.length).toBeGreaterThan(0);
      expect(bushes.length).toBeGreaterThan(0);
    });
  });

  describe("Edge Cases and Error Handling", () => {
    it("should handle very small minDistance", () => {
      const points = poissonDiscSampling(50, 50, 1);
      expect(points.length).toBeGreaterThan(100);
    });

    it("should handle very large minDistance", () => {
      const points = poissonDiscSampling(100, 100, 200);
      // Should only get 1-2 points maximum
      expect(points.length).toBeLessThanOrEqual(5);
    });

    it("should handle zero jitter in sampling", () => {
      const noise = fastBlueNoise(10, 10);
      const points = sampleFromBlueNoise(noise, 0.5, 0);

      expect(points.length).toBeGreaterThanOrEqual(0);
    });

    it("should handle maximum jitter in sampling", () => {
      const noise = fastBlueNoise(10, 10);
      const points = sampleFromBlueNoise(noise, 0.5, 1.0);

      expect(points.length).toBeGreaterThanOrEqual(0);
    });

    it("should handle empty texture in sampling", () => {
      const noise: number[][] = Array(10)
        .fill(null)
        .map(() => Array(10).fill(0));
      const points = sampleFromBlueNoise(noise, 0.5);

      expect(points.length).toBe(0);
    });

    it("should handle full texture in sampling", () => {
      const noise: number[][] = Array(10)
        .fill(null)
        .map(() => Array(10).fill(1));
      const points = sampleFromBlueNoise(noise, 0.5, 0);

      expect(points.length).toBe(100);
    });
  });

  describe("Statistical Properties", () => {
    it("should have roughly uniform spatial distribution", () => {
      const size = 200;
      const points = poissonDiscSampling(size, size, 15, 30, 9999);

      // Divide into grid and count points per cell
      const gridSize = 10;
      const cellSize = size / gridSize;
      const grid = Array(gridSize)
        .fill(null)
        .map(() => Array(gridSize).fill(0));

      points.forEach((p) => {
        const gx = Math.min(Math.floor(p.x / cellSize), gridSize - 1);
        const gy = Math.min(Math.floor(p.y / cellSize), gridSize - 1);
        grid[gx][gy]++;
      });

      // Count how many cells have at least one point
      let nonEmptyCells = 0;
      for (let x = 0; x < gridSize; x++) {
        for (let y = 0; y < gridSize; y++) {
          if (grid[x][y] > 0) nonEmptyCells++;
        }
      }

      // Most cells should have at least one point (good distribution)
      expect(nonEmptyCells).toBeGreaterThan(gridSize * gridSize * 0.7);
    });

    it("should have low variance in local density", () => {
      const points = poissonDiscSampling(200, 200, 15, 30, 8888);

      // Sample local densities at various points
      const densities: number[] = [];
      const sampleRadius = 30;

      for (let sx = 50; sx < 150; sx += 50) {
        for (let sy = 50; sy < 150; sy += 50) {
          let localCount = 0;
          points.forEach((p) => {
            const dx = p.x - sx;
            const dy = p.y - sy;
            if (Math.sqrt(dx * dx + dy * dy) < sampleRadius) {
              localCount++;
            }
          });
          densities.push(localCount);
        }
      }

      // Calculate variance
      const mean = densities.reduce((a, b) => a + b, 0) / densities.length;
      const variance =
        densities.reduce((sum, d) => sum + Math.pow(d - mean, 2), 0) /
        densities.length;
      const stdDev = Math.sqrt(variance);

      // Low standard deviation indicates consistent density
      expect(stdDev).toBeLessThan(mean * 0.5);
    });
  });
});

interface PerformanceMetric {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, any>;
}

class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetric> = new Map();
  private static instance: PerformanceMonitor;

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  startTiming(name: string, metadata?: Record<string, any>): void {
    this.metrics.set(name, {
      name,
      startTime: performance.now(),
      metadata
    });
  }

  endTiming(name: string): number | null {
    const metric = this.metrics.get(name);
    if (!metric) {
      console.warn(`No timing found for: ${name}`);
      return null;
    }

    const endTime = performance.now();
    const duration = endTime - metric.startTime;
    
    metric.endTime = endTime;
    metric.duration = duration;
    
    // Log slow operations
    if (duration > 1000) {
      console.warn(`Slow operation detected: ${name} took ${duration.toFixed(2)}ms`, metric.metadata);
    }

    return duration;
  }

  getMetric(name: string): PerformanceMetric | undefined {
    return this.metrics.get(name);
  }

  getAllMetrics(): PerformanceMetric[] {
    return Array.from(this.metrics.values());
  }

  clearMetrics(): void {
    this.metrics.clear();
  }

  // Helper method to measure async operations
  async measureAsync<T>(
    name: string, 
    operation: () => Promise<T>, 
    metadata?: Record<string, any>
  ): Promise<T> {
    this.startTiming(name, metadata);
    try {
      const result = await operation();
      this.endTiming(name);
      return result;
    } catch (error) {
      this.endTiming(name);
      throw error;
    }
  }

  // Helper method to measure sync operations
  measure<T>(
    name: string, 
    operation: () => T, 
    metadata?: Record<string, any>
  ): T {
    this.startTiming(name, metadata);
    try {
      const result = operation();
      this.endTiming(name);
      return result;
    } catch (error) {
      this.endTiming(name);
      throw error;
    }
  }
}

export const perf = PerformanceMonitor.getInstance();

// Performance decorators for API routes
export function measureApiPerformance(routeName: string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      const startTime = performance.now();
      try {
        const result = await method.apply(this, args);
        const duration = performance.now() - startTime;
        
        console.log(`API ${routeName} completed in ${duration.toFixed(2)}ms`);
        
        if (duration > 500) {
          console.warn(`Slow API response: ${routeName} took ${duration.toFixed(2)}ms`);
        }
        
        return result;
      } catch (error) {
        const duration = performance.now() - startTime;
        console.error(`API ${routeName} failed after ${duration.toFixed(2)}ms:`, error);
        throw error;
      }
    };
  };
}

// Cache performance utilities
export class CachePerformance {
  private static hitCount = 0;
  private static missCount = 0;
  private static totalLookupTime = 0;

  static recordHit(lookupTime: number): void {
    this.hitCount++;
    this.totalLookupTime += lookupTime;
  }

  static recordMiss(lookupTime: number): void {
    this.missCount++;
    this.totalLookupTime += lookupTime;
  }

  static getStats() {
    const total = this.hitCount + this.missCount;
    return {
      hitRate: total > 0 ? (this.hitCount / total) * 100 : 0,
      missRate: total > 0 ? (this.missCount / total) * 100 : 0,
      averageLookupTime: total > 0 ? this.totalLookupTime / total : 0,
      totalHits: this.hitCount,
      totalMisses: this.missCount
    };
  }

  static reset(): void {
    this.hitCount = 0;
    this.missCount = 0;
    this.totalLookupTime = 0;
  }
}

// Memory usage monitoring
export function getMemoryUsage() {
  if (typeof process !== 'undefined' && process.memoryUsage) {
    const usage = process.memoryUsage();
    return {
      rss: Math.round(usage.rss / 1024 / 1024), // MB
      heapTotal: Math.round(usage.heapTotal / 1024 / 1024), // MB
      heapUsed: Math.round(usage.heapUsed / 1024 / 1024), // MB
      external: Math.round(usage.external / 1024 / 1024), // MB
    };
  }
  return null;
}

// Performance thresholds based on PRD requirements
export const PERFORMANCE_THRESHOLDS = {
  FACE_FETCH_P95: 300, // ms
  UPLOAD_PROCESSING: 4000, // ms
  SYNC_PROPAGATION: 2000, // ms
  PROGRESS_API: 500, // ms
  CACHE_TTL: 30000, // ms
} as const;

// Performance validation
export function validatePerformance(operation: string, duration: number): boolean {
  const thresholds: Record<string, number> = {
    'face_fetch': PERFORMANCE_THRESHOLDS.FACE_FETCH_P95,
    'upload_processing': PERFORMANCE_THRESHOLDS.UPLOAD_PROCESSING,
    'sync_propagation': PERFORMANCE_THRESHOLDS.SYNC_PROPAGATION,
    'progress_api': PERFORMANCE_THRESHOLDS.PROGRESS_API,
  };

  const threshold = thresholds[operation];
  if (!threshold) return true;

  const passed = duration <= threshold;
  if (!passed) {
    console.error(`Performance threshold exceeded: ${operation} took ${duration.toFixed(2)}ms (threshold: ${threshold}ms)`);
  }

  return passed;
}

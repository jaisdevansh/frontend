/**
 * Performance monitoring utilities for production
 * Tracks app performance metrics without impacting user experience
 */
import React from 'react';

interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private timers: Map<string, number> = new Map();
  private readonly MAX_METRICS = 100;

  /**
   * Start timing an operation
   */
  start(name: string): void {
    if (!__DEV__) return; // Only track in development
    this.timers.set(name, Date.now());
  }

  /**
   * End timing and record metric
   */
  end(name: string): number | null {
    if (!__DEV__) return null;
    
    const startTime = this.timers.get(name);
    if (!startTime) {
      console.warn(`[Performance] No start time found for: ${name}`);
      return null;
    }

    const duration = Date.now() - startTime;
    this.timers.delete(name);

    this.metrics.push({
      name,
      duration,
      timestamp: Date.now(),
    });

    // Keep only recent metrics
    if (this.metrics.length > this.MAX_METRICS) {
      this.metrics.shift();
    }

    // Log slow operations
    if (duration > 1000) {
      console.warn(`[Performance] Slow operation: ${name} took ${duration}ms`);
    }

    return duration;
  }

  /**
   * Get all recorded metrics
   */
  getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  /**
   * Get average duration for a specific metric
   */
  getAverage(name: string): number {
    const filtered = this.metrics.filter(m => m.name === name);
    if (filtered.length === 0) return 0;
    
    const sum = filtered.reduce((acc, m) => acc + m.duration, 0);
    return sum / filtered.length;
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics = [];
    this.timers.clear();
  }

  /**
   * Get performance summary
   */
  getSummary(): Record<string, { count: number; avg: number; max: number }> {
    const summary: Record<string, { count: number; avg: number; max: number }> = {};

    this.metrics.forEach(metric => {
      if (!summary[metric.name]) {
        summary[metric.name] = { count: 0, avg: 0, max: 0 };
      }

      const s = summary[metric.name];
      s.count++;
      s.avg = (s.avg * (s.count - 1) + metric.duration) / s.count;
      s.max = Math.max(s.max, metric.duration);
    });

    return summary;
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor();

/**
 * HOC to measure component render time
 */
export function withPerformanceTracking<P extends object>(
  Component: React.ComponentType<P>,
  componentName: string
): React.ComponentType<P> {
  if (!__DEV__) return Component;

  return (props: P) => {
    React.useEffect(() => {
      performanceMonitor.start(`${componentName}_mount`);
      return () => {
        performanceMonitor.end(`${componentName}_mount`);
      };
    }, []);

    return React.createElement(Component, props);
  };
}

/**
 * Hook to measure async operations
 */
export function usePerformanceTracking(operationName: string) {
  const track = React.useCallback(
    async <T,>(operation: () => Promise<T>): Promise<T> => {
      performanceMonitor.start(operationName);
      try {
        return await operation();
      } finally {
        performanceMonitor.end(operationName);
      }
    },
    [operationName]
  );

  return track;
}

// Export for debugging in dev
if (__DEV__) {
  (global as any).performanceMonitor = performanceMonitor;
}

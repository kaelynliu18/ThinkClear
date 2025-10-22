import { NextResponse } from 'next/server';
import { checkServiceHealth } from '../../../lib/retry';
import { getCacheStats } from '../../../lib/faceStorage';
import { getProgressCacheStats } from '../../../lib/progressStorage';
import { getMemoryUsage } from '../../../lib/performance';
import { syncManager } from '../../../lib/syncManager';

export async function GET() {
  try {
    const startTime = Date.now();
    
    // Check all services
    const [serviceHealth, memoryUsage, faceCacheStats, progressCacheStats] = await Promise.all([
      checkServiceHealth(),
      Promise.resolve(getMemoryUsage()),
      Promise.resolve(getCacheStats()),
      Promise.resolve(getProgressCacheStats())
    ]);

    const responseTime = Date.now() - startTime;

    const health = {
      status: serviceHealth.overall ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      responseTime,
      services: {
        blobStorage: {
          status: serviceHealth.blobStorage ? 'up' : 'down',
          responseTime: responseTime
        },
        database: {
          status: serviceHealth.database ? 'up' : 'down',
          responseTime: responseTime
        },
        syncManager: {
          status: serviceHealth.syncManager ? 'up' : 'down',
          responseTime: responseTime,
          activeConnections: syncManager.getClientCount()
        }
      },
      performance: {
        memory: memoryUsage,
        caches: {
          faceCache: {
            size: faceCacheStats.size,
            entries: faceCacheStats.entries.length
          },
          progressCache: {
            size: progressCacheStats.size,
            entries: progressCacheStats.entries.length
          }
        }
      },
      version: {
        api: '1.0.0',
        node: process.version
      }
    };

    const statusCode = serviceHealth.overall ? 200 : 503;
    
    const res = NextResponse.json(health, { status: statusCode });
    res.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.headers.set('X-Response-Time', `${responseTime}ms`);
    
    return res;
  } catch (error) {
    console.error('Health check failed:', error);
    
    const errorResponse = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
      services: {
        blobStorage: { status: 'unknown' },
        database: { status: 'unknown' },
        syncManager: { status: 'unknown' }
      }
    };

    const res = NextResponse.json(errorResponse, { status: 503 });
    res.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    
    return res;
  }
}

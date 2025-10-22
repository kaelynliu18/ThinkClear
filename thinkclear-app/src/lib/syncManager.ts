import { NextRequest } from 'next/server';
import { loadFaceStoreWithVersion, FaceStoreVersion } from './faceStorage';

interface SyncEvent {
  type: 'face_update' | 'face_delete' | 'face_add' | 'version_check';
  userId: string;
  version: FaceStoreVersion;
  data?: any;
  timestamp: string;
}

class SyncManager {
  private clients = new Map<string, Set<ReadableStreamDefaultController>>();
  private lastVersions = new Map<string, FaceStoreVersion>();

  addClient(userId: string, controller: ReadableStreamDefaultController) {
    if (!this.clients.has(userId)) {
      this.clients.set(userId, new Set());
    }
    this.clients.get(userId)!.add(controller);
  }

  removeClient(userId: string, controller: ReadableStreamDefaultController) {
    const userClients = this.clients.get(userId);
    if (userClients) {
      userClients.delete(controller);
      if (userClients.size === 0) {
        this.clients.delete(userId);
      }
    }
  }

  async broadcastToUser(userId: string, event: SyncEvent) {
    const userClients = this.clients.get(userId);
    if (!userClients || userClients.size === 0) return;

    const message = `data: ${JSON.stringify(event)}\n\n`;
    const deadClients: ReadableStreamDefaultController[] = [];

    for (const controller of userClients) {
      try {
        controller.enqueue(new TextEncoder().encode(message));
      } catch (error) {
        console.warn('Failed to send message to client:', error);
        deadClients.push(controller);
      }
    }

    // Clean up dead clients
    deadClients.forEach(controller => {
      userClients.delete(controller);
    });
  }

  async notifyFaceUpdate(userId: string, version: FaceStoreVersion, changeType: 'add' | 'update' | 'delete', faceName?: string) {
    const event: SyncEvent = {
      type: `face_${changeType}` as any,
      userId,
      version,
      data: faceName ? { faceName } : undefined,
      timestamp: new Date().toISOString()
    };

    this.lastVersions.set(userId, version);
    await this.broadcastToUser(userId, event);
  }

  async checkVersionAndSync(userId: string, clientVersion: number): Promise<{ needsUpdate: boolean; version?: FaceStoreVersion }> {
    try {
      const currentStore = await loadFaceStoreWithVersion(userId);
      const currentVersion = currentStore.version.version;
      
      if (currentVersion > clientVersion) {
        return {
          needsUpdate: true,
          version: currentStore.version
        };
      }
      
      return { needsUpdate: false };
    } catch (error) {
      console.error('Failed to check version:', error);
      return { needsUpdate: false };
    }
  }

  getClientCount(userId?: string): number {
    if (userId) {
      return this.clients.get(userId)?.size || 0;
    }
    return Array.from(this.clients.values()).reduce((sum, clients) => sum + clients.size, 0);
  }

  getLastVersion(userId: string): FaceStoreVersion | undefined {
    return this.lastVersions.get(userId);
  }
}

// Singleton instance
export const syncManager = new SyncManager();

export function createSSEStream(userId: string): ReadableStream {
  let controller: ReadableStreamDefaultController;
  
  return new ReadableStream({
    start(ctrl) {
      controller = ctrl;
      
      // Send initial connection message
      const initMessage = `data: ${JSON.stringify({
        type: 'connection',
        userId,
        timestamp: new Date().toISOString()
      })}\n\n`;
      
      controller.enqueue(new TextEncoder().encode(initMessage));
      
      // Add client to sync manager
      syncManager.addClient(userId, controller);
      
      // Send keepalive every 30 seconds
      const keepAliveInterval = setInterval(() => {
        try {
          const keepAliveMessage = `data: ${JSON.stringify({
            type: 'keepalive',
            timestamp: new Date().toISOString()
          })}\n\n`;
          controller.enqueue(new TextEncoder().encode(keepAliveMessage));
        } catch (error) {
          clearInterval(keepAliveInterval);
        }
      }, 30000);
      
      // Cleanup on close - remove the signal listener as it's not available on ReadableStreamDefaultController
      // The cleanup will happen in the cancel method instead
    },
    
    cancel() {
      if (controller) {
        syncManager.removeClient(userId, controller);
      }
    }
  });
}

export async function handleSSERequest(req: NextRequest, userId: string) {
  const url = new URL(req.url);
  const clientVersion = parseInt(url.searchParams.get('version') || '0');
  
  // Check if client needs immediate update
  const versionCheck = await syncManager.checkVersionAndSync(userId, clientVersion);
  
  const stream = createSSEStream(userId);
  
  // If client is behind, send immediate update
  if (versionCheck.needsUpdate && versionCheck.version) {
    const updateEvent: SyncEvent = {
      type: 'version_check',
      userId,
      version: versionCheck.version,
      timestamp: new Date().toISOString()
    };
    
    // We'll send this in the stream
    setTimeout(() => {
      syncManager.broadcastToUser(userId, updateEvent);
    }, 100);
  }
  
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    }
  });
}

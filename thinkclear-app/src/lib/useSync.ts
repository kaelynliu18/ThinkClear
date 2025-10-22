import { useEffect, useRef, useState, useCallback } from 'react';

interface SyncEvent {
  type: 'face_update' | 'face_delete' | 'face_add' | 'version_check' | 'connection' | 'keepalive';
  userId: string;
  version?: {
    version: number;
    lastModified: string;
    checksum: string;
  };
  data?: any;
  timestamp: string;
}

interface UseSyncOptions {
  userId: string;
  onFaceUpdate?: (event: SyncEvent) => void;
  onVersionCheck?: (version: number) => void;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

export function useSync({
  userId,
  onFaceUpdate,
  onVersionCheck,
  reconnectInterval = 5000,
  maxReconnectAttempts = 5
}: UseSyncOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastVersion, setLastVersion] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);

  const connect = useCallback(() => {
    if (!userId) return;

    // Clean up existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    try {
      const eventSource = new EventSource(`/api/sync?version=${lastVersion}`);
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        setIsConnected(true);
        setError(null);
        reconnectAttemptsRef.current = 0;
        console.log('Sync connection established');
      };

      eventSource.onmessage = (event) => {
        try {
          const syncEvent: SyncEvent = JSON.parse(event.data);
          
          if (syncEvent.type === 'connection') {
            console.log('Sync connection confirmed');
            return;
          }

          if (syncEvent.type === 'keepalive') {
            return;
          }

          if (syncEvent.type === 'version_check' && syncEvent.version) {
            setLastVersion(syncEvent.version.version);
            onVersionCheck?.(syncEvent.version.version);
            return;
          }

          if (syncEvent.version) {
            setLastVersion(syncEvent.version.version);
          }

          onFaceUpdate?.(syncEvent);
        } catch (parseError) {
          console.error('Failed to parse sync event:', parseError);
        }
      };

      eventSource.onerror = (error) => {
        console.error('Sync connection error:', error);
        setIsConnected(false);
        
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++;
          setError(`Connection lost. Reconnecting... (${reconnectAttemptsRef.current}/${maxReconnectAttempts})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectInterval);
        } else {
          setError('Failed to reconnect. Please refresh the page.');
        }
      };
    } catch (error) {
      console.error('Failed to create sync connection:', error);
      setError('Failed to establish sync connection');
    }
  }, [userId, lastVersion, onFaceUpdate, onVersionCheck, reconnectInterval, maxReconnectAttempts]);

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    setIsConnected(false);
    reconnectAttemptsRef.current = 0;
  }, []);

  const forceReconnect = useCallback(() => {
    disconnect();
    setTimeout(connect, 1000);
  }, [disconnect, connect]);

  useEffect(() => {
    connect();
    
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    isConnected,
    lastVersion,
    error,
    reconnect: forceReconnect,
    disconnect
  };
}

// Hook for face data with real-time sync
export function useFaceData(userId: string) {
  const [faces, setFaces] = useState<Record<string, any>>({});
  const [version, setVersion] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFaces = useCallback(async (includeVersion = false) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/faces${includeVersion ? '?includeVersion=true' : ''}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch faces');
      }
      
      const data = await response.json();
      
      if (includeVersion && data.faces) {
        setFaces(data.faces);
        setVersion(data.version?.version || 0);
      } else {
        setFaces(data);
      }
      
      setError(null);
    } catch (err) {
      console.error('Failed to fetch faces:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch faces');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleFaceUpdate = useCallback((event: SyncEvent) => {
    if (event.type === 'face_add' || event.type === 'face_update' || event.type === 'face_delete') {
      // Refetch faces when there's an update
      fetchFaces(true);
    }
  }, [fetchFaces]);

  const { isConnected, lastVersion: syncVersion } = useSync({
    userId,
    onFaceUpdate: handleFaceUpdate,
    onVersionCheck: (newVersion) => {
      if (newVersion > version) {
        fetchFaces(true);
      }
    }
  });

  useEffect(() => {
    fetchFaces(true);
  }, [fetchFaces]);

  return {
    faces,
    version: Math.max(version, syncVersion),
    loading,
    error,
    isConnected,
    refetch: () => fetchFaces(true)
  };
}

// Hook for progress data with real-time sync
export function useProgressData(userId: string) {
  const [progress, setProgress] = useState<{
    entries: any[];
    accuracy: any[];
    version?: number;
    lastUpdated?: string;
  }>({ entries: [], accuracy: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProgress = useCallback(async (includeVersion = false) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/progress${includeVersion ? '?includeVersion=true' : ''}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch progress');
      }
      
      const data = await response.json();
      setProgress(data);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch progress:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch progress');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleFaceUpdate = useCallback((event: SyncEvent) => {
    if (event.type === 'face_delete') {
      // Refetch progress when a face is deleted
      fetchProgress(true);
    }
  }, [fetchProgress]);

  useSync({
    userId,
    onFaceUpdate: handleFaceUpdate
  });

  useEffect(() => {
    fetchProgress(true);
  }, [fetchProgress]);

  return {
    progress,
    loading,
    error,
    refetch: () => fetchProgress(true)
  };
}

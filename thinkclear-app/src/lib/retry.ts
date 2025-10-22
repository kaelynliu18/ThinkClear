interface RetryOptions {
  maxAttempts?: number;
  baseDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  retryCondition?: (error: any) => boolean;
  onRetry?: (attempt: number, error: any) => void;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
  retryCondition: (error) => {
    // Retry on network errors, timeouts, and 5xx status codes
    if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') return true;
    if (error.status >= 500 && error.status < 600) return true;
    if (error.message?.includes('timeout')) return true;
    return false;
  },
  onRetry: (attempt, error) => {
    console.warn(`Retry attempt ${attempt} after error:`, error.message);
  }
};

export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: any;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      if (attempt === opts.maxAttempts) {
        break;
      }

      if (!opts.retryCondition(error)) {
        break;
      }

      opts.onRetry(attempt, error);

      const delay = Math.min(
        opts.baseDelay * Math.pow(opts.backoffMultiplier, attempt - 1),
        opts.maxDelay
      );

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

// Specific retry strategies for different operations
export const retryStrategies = {
  // For blob storage operations
  blobStorage: (operation: () => Promise<any>) => withRetry(operation, {
    maxAttempts: 3,
    baseDelay: 500,
    maxDelay: 5000,
    retryCondition: (error) => {
      return error.status >= 500 || 
             error.code === 'ECONNRESET' || 
             error.code === 'ETIMEDOUT' ||
             error.message?.includes('timeout');
    }
  }),

  // For API calls
  apiCall: (operation: () => Promise<any>) => withRetry(operation, {
    maxAttempts: 2,
    baseDelay: 1000,
    maxDelay: 3000,
    retryCondition: (error) => {
      return error.status >= 500 || error.status === 429;
    }
  }),

  // For image processing
  imageProcessing: (operation: () => Promise<any>) => withRetry(operation, {
    maxAttempts: 2,
    baseDelay: 2000,
    maxDelay: 8000,
    retryCondition: (error) => {
      return error.message?.includes('processing') || 
             error.message?.includes('conversion');
    }
  }),

  // For sync operations
  syncOperation: (operation: () => Promise<any>) => withRetry(operation, {
    maxAttempts: 5,
    baseDelay: 200,
    maxDelay: 2000,
    retryCondition: (error) => {
      return error.status >= 500 || 
             error.code === 'ECONNRESET' ||
             error.message?.includes('network');
    }
  })
};

// Circuit breaker pattern for preventing cascade failures
class CircuitBreaker {
  private failureCount = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  constructor(
    private threshold: number = 5,
    private timeout: number = 60000,
    private resetTimeout: number = 30000
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.resetTimeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }

  private onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.failureCount >= this.threshold) {
      this.state = 'OPEN';
    }
  }

  getState() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime
    };
  }
}

export const circuitBreakers = {
  blobStorage: new CircuitBreaker(3, 60000, 30000),
  imageProcessing: new CircuitBreaker(2, 120000, 60000),
  syncManager: new CircuitBreaker(5, 30000, 15000)
};

// Error classification and handling
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public retryable: boolean = false,
    public metadata?: Record<string, any>
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function classifyError(error: any): AppError {
  if (error instanceof AppError) {
    return error;
  }

  // Network errors
  if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
    return new AppError(
      'Network connection failed',
      'NETWORK_ERROR',
      503,
      true,
      { originalError: error.message }
    );
  }

  // Blob storage errors
  if (error.status >= 500 && error.status < 600) {
    return new AppError(
      'Storage service temporarily unavailable',
      'STORAGE_ERROR',
      error.status,
      true,
      { originalError: error.message }
    );
  }

  // Authentication errors
  if (error.status === 401 || error.status === 403) {
    return new AppError(
      'Authentication required',
      'AUTH_ERROR',
      error.status,
      false,
      { originalError: error.message }
    );
  }

  // Validation errors
  if (error.status === 400) {
    return new AppError(
      'Invalid request data',
      'VALIDATION_ERROR',
      400,
      false,
      { originalError: error.message }
    );
  }

  // Rate limiting
  if (error.status === 429) {
    return new AppError(
      'Too many requests',
      'RATE_LIMITED',
      429,
      true,
      { originalError: error.message }
    );
  }

  // Default error
  return new AppError(
    error.message || 'An unexpected error occurred',
    'UNKNOWN_ERROR',
    500,
    false,
    { originalError: error.message }
  );
}

// Timeout wrapper
export function withTimeout<T>(
  operation: () => Promise<T>,
  timeoutMs: number,
  timeoutMessage = 'Operation timed out'
): Promise<T> {
  return Promise.race([
    operation(),
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
    })
  ]);
}

// Health check utilities
export async function checkServiceHealth(): Promise<{
  blobStorage: boolean;
  database: boolean;
  syncManager: boolean;
  overall: boolean;
}> {
  const checks = await Promise.allSettled([
    // Check blob storage
    fetch('/api/faces?includeVersion=true').then(r => r.ok),
    
    // Check database
    fetch('/api/progress?includeVersion=true').then(r => r.ok),
    
    // Check sync manager
    new Promise<boolean>((resolve) => {
      const eventSource = new EventSource('/api/sync');
      const timeout = setTimeout(() => {
        eventSource.close();
        resolve(false);
      }, 5000);
      
      eventSource.onopen = () => {
        clearTimeout(timeout);
        eventSource.close();
        resolve(true);
      };
      
      eventSource.onerror = () => {
        clearTimeout(timeout);
        eventSource.close();
        resolve(false);
      };
    })
  ]);

  const [blobStorage, database, syncManager] = checks.map(
    result => result.status === 'fulfilled' && result.value
  );

  return {
    blobStorage: !!blobStorage,
    database: !!database,
    syncManager: !!syncManager,
    overall: !!(blobStorage && database && syncManager)
  };
}

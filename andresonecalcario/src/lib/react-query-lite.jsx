import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

const DEFAULT_KEY = ['__default__'];

class QueryClient {
  constructor() {
    this.cache = new Map();
    this.listeners = new Map();
  }

  _serializeKey(queryKey = DEFAULT_KEY) {
    return JSON.stringify(queryKey);
  }

  getQueryData(queryKey) {
    return this.cache.get(this._serializeKey(queryKey));
  }

  hasQueryData(queryKey) {
    return this.cache.has(this._serializeKey(queryKey));
  }

  setQueryData(queryKey, data) {
    const key = this._serializeKey(queryKey);
    this.cache.set(key, data);
    this._notify(key, { type: 'update', data });
  }

  invalidateQueries(queryKey) {
    const key = this._serializeKey(queryKey);
    this.cache.delete(key);
    this._notify(key, { type: 'invalidate' });
  }

  subscribe(queryKey, callback) {
    const key = this._serializeKey(queryKey);
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }

    const listeners = this.listeners.get(key);
    listeners.add(callback);

    return () => {
      listeners.delete(callback);
      if (listeners.size === 0) {
        this.listeners.delete(key);
      }
    };
  }

  _notify(key, event) {
    const listeners = this.listeners.get(key);
    if (!listeners) return;
    listeners.forEach((listener) => listener(event));
  }
}

const QueryClientContext = createContext(new QueryClient());

export const QueryClientProvider = ({ client, children }) => {
  const value = useMemo(() => client ?? new QueryClient(), [client]);
  return <QueryClientContext.Provider value={value}>{children}</QueryClientContext.Provider>;
};

export const useQueryClient = () => useContext(QueryClientContext);

export const useQuery = ({
  queryKey = DEFAULT_KEY,
  queryFn,
  enabled = true,
  initialData,
  refetchOnWindowFocus = false,
  refetchOnMount = true
}) => {
  const client = useQueryClient();
  const serializedKey = useMemo(() => JSON.stringify(queryKey ?? DEFAULT_KEY), [queryKey]);
  const initialCache = client.getQueryData(queryKey);
  const hasInitialData = typeof initialData !== 'undefined';

  const [state, setState] = useState(() => ({
    data: initialCache ?? (hasInitialData ? initialData : undefined),
    error: null,
    isLoading: enabled && !initialCache && !hasInitialData,
    isFetching: false
  }));

  const latestQueryFn = useRef(queryFn);
  useEffect(() => {
    latestQueryFn.current = queryFn;
  }, [queryFn]);

  const runQuery = useCallback(async () => {
    if (!enabled || !latestQueryFn.current) {
      return client.getQueryData(queryKey);
    }

    setState((prev) => ({
      ...prev,
      isFetching: true,
      isLoading: prev.data === undefined && prev.error === null
    }));

    try {
      const result = await latestQueryFn.current();
      client.setQueryData(queryKey, result);
      setState({ data: result, error: null, isLoading: false, isFetching: false });
      return result;
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error,
        isLoading: false,
        isFetching: false
      }));
      throw error;
    }
  }, [client, enabled, queryKey]);

  useEffect(() => {
    let ignore = false;

    const shouldFetch = () => {
      if (!enabled) return false;
      if (!client.hasQueryData(queryKey)) return true;
      return refetchOnMount;
    };

    if (shouldFetch()) {
      runQuery().catch(() => {
        if (!ignore) {
          // errors are already stored in state
        }
      });
    }

    return () => {
      ignore = true;
    };
  }, [client, queryKey, enabled, refetchOnMount, runQuery]);

  useEffect(() => {
    if (!refetchOnWindowFocus || typeof window === 'undefined') {
      return undefined;
    }

    const handler = () => {
      runQuery().catch(() => {});
    };

    window.addEventListener('focus', handler);
    return () => window.removeEventListener('focus', handler);
  }, [refetchOnWindowFocus, runQuery]);

  useEffect(() => {
    const unsubscribe = client.subscribe(queryKey, (event) => {
      if (event?.type === 'invalidate') {
        runQuery().catch(() => {});
      } else if (event?.type === 'update') {
        setState({ data: event.data, error: null, isLoading: false, isFetching: false });
      }
    });
    return unsubscribe;
  }, [client, queryKey, runQuery, serializedKey]);

  return {
    data: state.data,
    error: state.error,
    isLoading: state.isLoading,
    isFetching: state.isFetching,
    refetch: () => runQuery()
  };
};

export const useMutation = ({ mutationFn, onSuccess, onError }) => {
  const client = useQueryClient();
  const [state, setState] = useState({ isPending: false, error: null });

  const mutateAsync = useCallback(
    async (variables) => {
      setState({ isPending: true, error: null });
      try {
        const result = await mutationFn(variables);
        await onSuccess?.(result, variables, client);
        setState({ isPending: false, error: null });
        return result;
      } catch (error) {
        setState({ isPending: false, error });
        onError?.(error, variables, client);
        throw error;
      }
    },
    [client, mutationFn, onError, onSuccess]
  );

  const mutate = useCallback(
    (variables) => {
      mutateAsync(variables).catch(() => {});
    },
    [mutateAsync]
  );

  return {
    mutate,
    mutateAsync,
    isPending: state.isPending,
    error: state.error
  };
};

export { QueryClient };

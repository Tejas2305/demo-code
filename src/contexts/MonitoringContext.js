import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

const MonitoringContext = createContext();
const MAX_LOGS = 250;

const normalizeUrl = (url) => {
  if (!url) return '';
  try {
    const rawUrl = typeof url === 'string' ? url : url?.url || '';
    const parsed = new URL(rawUrl, window.location.origin);
    return parsed.pathname + parsed.search;
  } catch {
    return typeof url === 'string' ? url : String(url);
  }
};

export const MonitoringProvider = ({ children }) => {
  const [requests, setRequests] = useState([]);

  const addRequest = (entry) => {
    setRequests((prev) => [entry, ...prev].slice(0, MAX_LOGS));
  };

  useEffect(() => {
    if (typeof window === 'undefined' || window.__monitoringPatched) {
      return;
    }

    const originalFetch = window.fetch.bind(window);
    const originalXhrOpen = window.XMLHttpRequest?.prototype.open;
    const originalXhrSend = window.XMLHttpRequest?.prototype.send;

    window.__monitoringPatched = true;

    const makeEntry = ({ method, url, status, duration, success, type, error }) => {
      addRequest({
        id: `${Date.now()}-${Math.random()}`,
        method,
        url: normalizeUrl(url),
        rawUrl: typeof url === 'string' ? url : url?.url || '',
        status,
        duration,
        success,
        type,
        error,
        timestamp: new Date().toISOString(),
      });
    };

    window.fetch = async (...args) => {
      const requestUrl = args[0];
      const init = args[1] || {};
      const method = (init.method || (typeof requestUrl === 'string' ? 'GET' : requestUrl.method) || 'GET').toUpperCase();
      const start = performance.now();
      try {
        const response = await originalFetch(...args);
        const duration = performance.now() - start;
        makeEntry({
          method,
          url: requestUrl,
          status: response.status,
          duration,
          success: response.ok,
          type: 'fetch',
        });
        return response;
      } catch (error) {
        const duration = performance.now() - start;
        makeEntry({
          method,
          url: requestUrl,
          status: 0,
          duration,
          success: false,
          type: 'fetch',
          error: String(error),
        });
        throw error;
      }
    };

    if (window.XMLHttpRequest && originalXhrOpen && originalXhrSend) {
      window.XMLHttpRequest.prototype.open = function (method, url, ...rest) {
        this._monitoringMethod = method ? method.toUpperCase() : 'GET';
        this._monitoringUrl = url;
        return originalXhrOpen.apply(this, [method, url, ...rest]);
      };

      window.XMLHttpRequest.prototype.send = function (body) {
        const xhr = this;
        const start = performance.now();
        const onEnd = () => {
          if (xhr._monitoringLogged) return;
          xhr._monitoringLogged = true;
          const duration = performance.now() - start;
          const status = xhr.status || 0;
          makeEntry({
            method: xhr._monitoringMethod || 'GET',
            url: xhr._monitoringUrl || '',
            status,
            duration,
            success: status >= 200 && status < 400,
            type: 'xhr',
          });
        };

        xhr.addEventListener('loadend', onEnd);
        xhr.addEventListener('error', onEnd);
        xhr.addEventListener('abort', onEnd);

        return originalXhrSend.apply(this, [body]);
      };
    }

    return () => {
      if (window.fetch) {
        window.fetch = originalFetch;
      }
      if (window.XMLHttpRequest && originalXhrOpen) {
        window.XMLHttpRequest.prototype.open = originalXhrOpen;
      }
      if (window.XMLHttpRequest && originalXhrSend) {
        window.XMLHttpRequest.prototype.send = originalXhrSend;
      }
      window.__monitoringPatched = false;
    };
  }, []);

  const endpointStats = useMemo(() => {
    const byUrl = {};
    requests.forEach((request) => {
      const key = request.url || 'unknown';
      if (!byUrl[key]) {
        byUrl[key] = {
          url: key,
          count: 0,
          totalDuration: 0,
          minDuration: Infinity,
          maxDuration: 0,
          successCount: 0,
          errorCount: 0,
        };
      }
      const group = byUrl[key];
      group.count += 1;
      group.totalDuration += request.duration;
      group.minDuration = Math.min(group.minDuration, request.duration);
      group.maxDuration = Math.max(group.maxDuration, request.duration);
      if (request.success) {
        group.successCount += 1;
      } else {
        group.errorCount += 1;
      }
    });

    return Object.values(byUrl)
      .map((endpoint) => ({
        ...endpoint,
        avgDuration:
          endpoint.count > 0 ? endpoint.totalDuration / endpoint.count : 0,
        minDuration:
          endpoint.minDuration === Infinity ? 0 : endpoint.minDuration,
      }))
      .sort((a, b) => b.totalDuration - a.totalDuration);
  }, [requests]);

  const overallStats = useMemo(() => {
    if (requests.length === 0) {
      return {
        count: 0,
        avgDuration: 0,
        minDuration: 0,
        maxDuration: 0,
      };
    }

    const durations = requests.map((request) => request.duration);
    const total = durations.reduce((sum, value) => sum + value, 0);

    return {
      count: durations.length,
      avgDuration: total / durations.length,
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations),
    };
  }, [requests]);

  const clearLogs = () => setRequests([]);

  return (
    <MonitoringContext.Provider
      value={{
        requests,
        endpointStats,
        overallStats,
        clearLogs,
      }}>
      {children}
    </MonitoringContext.Provider>
  );
};

export const useMonitoringContext = () => {
  const context = useContext(MonitoringContext);
  if (!context) {
    throw new Error('useMonitoringContext must be used within MonitoringProvider');
  }
  return context;
};

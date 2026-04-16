import React, { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback } from 'react';

const MonitoringContext = createContext();
const MAX_LOGS = 500;
const STORAGE_KEY = '__api_monitoring_data__';

// Extensions to EXCLUDE from resource tracking (scripts, stylesheets, source maps, HMR)
const EXCLUDED_EXTENSIONS = /\.(js|jsx|ts|tsx|css|map|hot-update)(\?.*)?$/i;
const EXCLUDED_PATTERNS = /(webpack|sockjs|hot-update|__vite|__webpack|react-refresh|\/static\/js\/|\/static\/css\/|\.chunk\.|bundle\.|manifest\.json)/i;

// Initiator types we care about (images, media, CDN, APIs, fonts, etc.)
const TRACKED_INITIATOR_TYPES = new Set([
  'img',
  'image',
  'media',
  'font',
  'xmlhttprequest',
  'fetch',
  'video',
  'audio',
  'beacon',
  'other',
  '',        // some entries have empty initiatorType
]);

// ─── Show full URL for external domains, pathname-only for same-origin ───
const normalizeUrl = (url) => {
  if (!url) return '';
  try {
    const rawUrl = typeof url === 'string' ? url : url?.url || '';
    const parsed = new URL(rawUrl, window.location.origin);
    // If the host is different from current page → keep full URL so user can see where it came from
    if (parsed.origin !== window.location.origin) {
      // Strip protocol for brevity, keep host + path + search
      return parsed.host + parsed.pathname + parsed.search;
    }
    return parsed.pathname + parsed.search;
  } catch {
    return typeof url === 'string' ? url : String(url);
  }
};

// Detect what kind of resource a URL is
const detectResourceType = (url, initiatorType) => {
  if (!url) return 'unknown';
  const lowerUrl = (typeof url === 'string' ? url : '').toLowerCase();

  // Check initiator type first
  if (initiatorType === 'img' || initiatorType === 'image') return 'image';
  if (initiatorType === 'font') return 'font';
  if (initiatorType === 'media' || initiatorType === 'video' || initiatorType === 'audio') return 'media';
  if (initiatorType === 'xmlhttprequest' || initiatorType === 'fetch') return 'api';

  // Fall back to URL pattern matching
  if (/\.(png|jpg|jpeg|gif|webp|svg|ico|avif|bmp|tiff)(\?.*)?$/i.test(lowerUrl)) return 'image';
  // Also catch image CDNs that use query params for format (Unsplash, Cloudinary, etc.)
  if (/images\.unsplash|cloudinary|imgix|imagekit|picsum\.photos|via\.placeholder/i.test(lowerUrl)) return 'image';
  if (/fm=(jpg|png|webp|avif|gif)/i.test(lowerUrl)) return 'image';
  if (/\.(woff2?|ttf|otf|eot)(\?.*)?$/i.test(lowerUrl)) return 'font';
  if (/\.(mp4|webm|ogg|mp3|wav|flac)(\?.*)?$/i.test(lowerUrl)) return 'media';
  if (/\.(json|xml)(\?.*)?$/i.test(lowerUrl) || /\/api\//i.test(lowerUrl)) return 'api';
  if (/fonts\.googleapis|fonts\.gstatic|use\.typekit/i.test(lowerUrl)) return 'font';
  if (/cdn\.|cloudfront|cloudflare|jsdelivr|unpkg|cdnjs/i.test(lowerUrl)) return 'cdn';

  return 'other';
};

// Should we track this resource entry?
const shouldTrackResource = (entry) => {
  const name = entry.name || '';
  const initiatorType = (entry.initiatorType || '').toLowerCase();

  // Always exclude script-initiated resources
  if (initiatorType === 'script') return false;

  // Exclude by file extension (JS, CSS source files, source maps, HMR)
  if (EXCLUDED_EXTENSIONS.test(name)) return false;
  if (EXCLUDED_PATTERNS.test(name)) return false;

  // For 'css' and 'link' initiator types: images loaded via CSS background-image
  // have initiatorType 'css', and fonts via <link> have 'link'.
  // Don't blanket-reject — check if the URL is actually an image/font/media/cdn.
  if (initiatorType === 'css' || initiatorType === 'link') {
    // Let detectResourceType decide based on URL alone (ignore initiatorType)
    const type = detectResourceType(name, '');
    return type === 'image' || type === 'font' || type === 'media' || type === 'cdn';
  }

  // Track if it's a known initiator type we care about
  if (TRACKED_INITIATOR_TYPES.has(initiatorType)) return true;

  // Track if it looks like an image/font/media/api from the URL
  const type = detectResourceType(name, initiatorType);
  return type !== 'unknown';
};

// ─── localStorage helpers ────────────────────────────────────────
const loadFromStorage = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.slice(0, MAX_LOGS);
    return [];
  } catch {
    return [];
  }
};

const saveToStorage = (data) => {
  try {
    // Only persist the last MAX_LOGS items
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data.slice(0, MAX_LOGS)));
  } catch {
    // localStorage full or unavailable — silently ignore
  }
};

export const MonitoringProvider = ({ children }) => {
  const [requests, setRequests] = useState(() => loadFromStorage());
  // Track already-seen resource URLs to avoid duplicates from PerformanceObserver
  const seenResources = useRef(new Set());
  // Debounce timer for persisting to localStorage
  const saveTimer = useRef(null);

  // Persist to localStorage whenever requests change (debounced)
  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveToStorage(requests);
    }, 500);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [requests]);

  const addRequest = useCallback((entry) => {
    setRequests((prev) => [entry, ...prev].slice(0, MAX_LOGS));
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || window.__monitoringPatched) {
      return;
    }

    const originalFetch = window.fetch.bind(window);
    const originalXhrOpen = window.XMLHttpRequest?.prototype.open;
    const originalXhrSend = window.XMLHttpRequest?.prototype.send;

    window.__monitoringPatched = true;

    const makeEntry = ({ method, url, status, duration, success, type, error, resourceType, size }) => {
      const rawUrl = typeof url === 'string' ? url : url?.url || '';
      const detectedType = resourceType || detectResourceType(rawUrl, type);
      addRequest({
        id: `${Date.now()}-${Math.random()}`,
        method,
        url: normalizeUrl(url),
        rawUrl,
        status,
        duration,
        success,
        type,          // fetch | xhr | resource
        resourceType: detectedType, // api | image | font | media | cdn | other
        error,
        size: size || null,
        timestamp: new Date().toISOString(),
      });
    };

    // ─── Intercept fetch() ─────────────────────────────────────
    window.fetch = async (...args) => {
      const requestUrl = args[0];
      const init = args[1] || {};
      const method = (init.method || (typeof requestUrl === 'string' ? 'GET' : requestUrl.method) || 'GET').toUpperCase();
      const start = performance.now();
      try {
        const response = await originalFetch(...args);
        const duration = performance.now() - start;
        const rawUrl = typeof requestUrl === 'string' ? requestUrl : requestUrl?.url || '';
        // Mark this URL as seen so PerformanceObserver doesn't duplicate
        seenResources.current.add(rawUrl);
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

    // ─── Intercept XMLHttpRequest ──────────────────────────────
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
          // Mark as seen
          if (xhr._monitoringUrl) seenResources.current.add(String(xhr._monitoringUrl));
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

    // ─── PerformanceObserver for resource loads (images, fonts, CDN, etc.) ──
    let perfObserver = null;
    try {
      if (typeof PerformanceObserver !== 'undefined') {
        perfObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          for (const entry of entries) {
            try {
              if (!shouldTrackResource(entry)) continue;

              // Skip if we already captured it via fetch/XHR interception
              if (seenResources.current.has(entry.name)) continue;
              // Mark so we don't re-process
              seenResources.current.add(entry.name);

              const duration = entry.duration || (entry.responseEnd - entry.startTime) || 0;
              const initiatorType = (entry.initiatorType || '').toLowerCase();
              const detectedType = detectResourceType(entry.name, initiatorType);

              // Don't track if we couldn't determine a meaningful resource type
              if (detectedType === 'unknown') continue;

              const size = entry.transferSize || entry.encodedBodySize || entry.decodedBodySize || null;

              addRequest({
                id: `${Date.now()}-${Math.random()}`,
                method: 'GET',
                url: normalizeUrl(entry.name),
                rawUrl: entry.name,
                status: entry.responseStatus || (duration > 0 ? 200 : 0),
                duration,
                success: duration > 0,
                type: 'resource',
                resourceType: detectedType,
                error: null,
                size,
                timestamp: new Date(performance.timeOrigin + entry.startTime).toISOString(),
              });
            } catch {
              // Skip malformed entries silently
            }
          }
        });
        perfObserver.observe({ type: 'resource', buffered: true });
      }
    } catch {
      // PerformanceObserver not supported — continue without resource tracking
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
      if (perfObserver) {
        try { perfObserver.disconnect(); } catch { /* noop */ }
      }
      window.__monitoringPatched = false;
    };
  }, [addRequest]);

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
          types: new Set(),
          resourceTypes: new Set(),
          totalSize: 0,
        };
      }
      const group = byUrl[key];
      group.count += 1;
      group.totalDuration += request.duration;
      group.minDuration = Math.min(group.minDuration, request.duration);
      group.maxDuration = Math.max(group.maxDuration, request.duration);
      if (request.type) group.types.add(request.type);
      if (request.resourceType) group.resourceTypes.add(request.resourceType);
      if (request.size) group.totalSize += request.size;
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
        types: Array.from(endpoint.types),
        resourceTypes: Array.from(endpoint.resourceTypes),
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

  // Stats broken down by resource type
  const resourceTypeStats = useMemo(() => {
    const byType = {};
    requests.forEach((r) => {
      const key = r.resourceType || 'unknown';
      if (!byType[key]) {
        byType[key] = { type: key, count: 0, totalDuration: 0, totalSize: 0, errorCount: 0 };
      }
      byType[key].count += 1;
      byType[key].totalDuration += r.duration || 0;
      if (r.size) byType[key].totalSize += r.size;
      if (!r.success) byType[key].errorCount += 1;
    });
    return Object.values(byType).sort((a, b) => b.count - a.count);
  }, [requests]);

  const clearLogs = () => {
    setRequests([]);
    seenResources.current.clear();
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* noop */ }
  };

  return (
    <MonitoringContext.Provider
      value={{
        requests,
        endpointStats,
        overallStats,
        resourceTypeStats,
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

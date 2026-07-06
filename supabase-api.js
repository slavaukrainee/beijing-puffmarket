(function (global) {
  function createSupabaseClient(url, key) {
    const headers = (prefer) => ({
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Prefer: prefer || 'return=representation',
    });

    function from(table) {
      const q = { table, filters: [], orders: [], limitN: null, method: 'GET', body: null };

      const api = {
        select() { return api; },
        order(col, opts = {}) {
          q.orders.push(`${col}.${opts.ascending === false ? 'desc' : 'asc'}`);
          return api;
        },
        eq(col, val) {
          q.filters.push(`${col}=eq.${encodeURIComponent(val)}`);
          return api;
        },
        limit(n) {
          q.limitN = n;
          return api;
        },
        insert(row) {
          q.method = 'POST';
          q.body = row;
          return api;
        },
        update(row) {
          q.method = 'PATCH';
          q.body = row;
          return api;
        },
        then(resolve, reject) {
          const params = [...q.filters];
          if (q.orders.length) params.push(`order=${q.orders.join(',')}`);
          if (q.limitN != null) params.push(`limit=${q.limitN}`);
          const query = params.length ? `?${params.join('&')}` : '';
          const prefer = q.method === 'GET' ? 'return=representation' : 'return=minimal';

          fetch(`${url}/rest/v1/${q.table}${query}`, {
            method: q.method,
            headers: headers(prefer),
            body: q.body != null ? JSON.stringify(q.body) : undefined,
          })
            .then(async (res) => {
              const text = await res.text();
              let data = null;
              if (text) {
                try { data = JSON.parse(text); } catch { data = text; }
              }
              if (!res.ok) {
                const message = typeof data === 'object' && data?.message ? data.message : text || res.statusText;
                resolve({ data: null, error: { message } });
                return;
              }
              if (q.method === 'GET') {
                resolve({ data: Array.isArray(data) ? data : (data ? [data] : []), error: null });
              } else {
                resolve({ data, error: null });
              }
            })
            .catch(reject);
        },
      };

      return api;
    }

    return { from };
  }

  global.createSupabaseClient = createSupabaseClient;
})(window);

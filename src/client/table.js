// Sortable, paginated table. viewRows/pageSlice are pure; mountTable wires them to the DOM.

const PAGE_SIZES = [10, 20, 50, 100, 'all'];
const htmlEsc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

function sortKey(col, row) {
  return col.sortValue ? col.sortValue(row) : row[col.key];
}

export function viewRows(rows, columns, sort, filter) {
  const out = filter ? rows.filter(filter) : rows.slice();
  if (sort) {
    const col = columns.find((c) => c.key === sort.key);
    if (col) {
      out.sort((a, b) => {
        const x = sortKey(col, a);
        const y = sortKey(col, b);
        if (x == null && y == null) return 0;
        if (x == null) return 1;
        if (y == null) return -1;
        const r = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), undefined, { numeric: true, sensitivity: 'base' });
        return r * sort.dir;
      });
    }
  }
  return out;
}

export function pageSlice(rows, size, page) {
  if (size === 'all') return { rows, page: 1, pages: 1 };
  const pages = Math.max(1, Math.ceil(rows.length / size));
  const p = Math.min(Math.max(1, page), pages);
  return { rows: rows.slice((p - 1) * size, p * size), page: p, pages };
}

function storedSize(key) {
  try {
    const v = localStorage.getItem(key);
    if (v === 'all') return 'all';
    if (v && PAGE_SIZES.includes(Number(v))) return Number(v);
  } catch (e) {}
  return 20;
}

/** columns: [{key,label,num?,render?(row)->html,sortValue?(row)}] */
export function mountTable(el, rows, columns, opts = {}) {
  const st = { sort: opts.sort || null, filter: null, size: storedSize('sr-page-size'), page: 1 };
  el.innerHTML = `<div class="table-scroll"><table><caption class="visually-hidden">${htmlEsc(opts.caption || 'Sessions')}</caption><thead><tr>${columns
    .map((c) => `<th scope="col" class="${c.num ? 'num' : ''}" data-key="${c.key}" aria-sort="none"><button type="button">${htmlEsc(c.label)}</button></th>`)
    .join('')}</tr></thead><tbody></tbody></table></div>
<div class="pager"><label>Show <select data-role="size">${PAGE_SIZES.map((s) => `<option value="${s}">${s === 'all' ? 'All' : s}</option>`).join('')}</select></label>
<button type="button" class="btn" data-role="prev">Previous</button><span data-role="info" aria-live="polite"></span><button type="button" class="btn" data-role="next">Next</button></div>`;
  const tbody = el.querySelector('tbody');
  const size = el.querySelector('[data-role=size]');
  const info = el.querySelector('[data-role=info]');
  size.value = String(st.size);

  function current() {
    return viewRows(rows, columns, st.sort, st.filter);
  }
  function draw() {
    const all = current();
    const pg = pageSlice(all, st.size, st.page);
    st.page = pg.page;
    tbody.innerHTML = pg.rows.length
      ? pg.rows.map((r) => `<tr>${columns.map((c) => `<td class="${c.num ? 'num' : ''}">${c.render ? c.render(r) : htmlEsc(r[c.key])}</td>`).join('')}</tr>`).join('')
      : `<tr><td colspan="${columns.length}" class="empty">${htmlEsc(opts.emptyText || 'Nothing matches.')}</td></tr>`;
    info.textContent = all.length ? `Page ${pg.page} of ${pg.pages} · ${all.length} row${all.length === 1 ? '' : 's'}` : '0 rows';
    el.querySelector('[data-role=prev]').disabled = pg.page <= 1;
    el.querySelector('[data-role=next]').disabled = pg.page >= pg.pages;
    el.querySelectorAll('th').forEach((th) => {
      const k = th.getAttribute('data-key');
      th.setAttribute('aria-sort', st.sort && st.sort.key === k ? (st.sort.dir > 0 ? 'ascending' : 'descending') : 'none');
    });
    if (opts.onChange) opts.onChange(all);
  }
  el.querySelectorAll('th button').forEach((b) =>
    b.addEventListener('click', () => {
      const k = b.parentElement.getAttribute('data-key');
      const col = columns.find((c) => c.key === k);
      st.sort = st.sort && st.sort.key === k ? { key: k, dir: -st.sort.dir } : { key: k, dir: col && col.num ? -1 : 1 };
      st.page = 1;
      draw();
    }),
  );
  size.addEventListener('change', () => {
    st.size = size.value === 'all' ? 'all' : Number(size.value);
    try {
      localStorage.setItem('sr-page-size', size.value);
    } catch (e) {}
    st.page = 1;
    draw();
  });
  el.querySelector('[data-role=prev]').addEventListener('click', () => {
    st.page--;
    draw();
  });
  el.querySelector('[data-role=next]').addEventListener('click', () => {
    st.page++;
    draw();
  });
  draw();
  return {
    setFilter(fn) {
      st.filter = fn;
      st.page = 1;
      draw();
    },
    setRows(r) {
      rows = r;
      st.page = 1;
      draw();
    },
    view: current,
  };
}

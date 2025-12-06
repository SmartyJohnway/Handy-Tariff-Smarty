import type { Handler } from '@netlify/functions';
import { loadUstr301 } from './utils/ustr-section301';

export const handler: Handler = async (event) => {
  try {
    const rows = await loadUstr301();
    if (!rows) {
      return { statusCode: 500, body: JSON.stringify({ success: false, message: 'USTR dataset not available' }, null, 2) };
    }

    const qs = event.queryStringParameters || {};
    const qRaw = (qs.q || '').toString();
    const list = (qs.list || '').toString().trim().toUpperCase();
    const rate = (qs.rate || '').toString().trim();
    const len = (qs.len || '').toString().trim();
    const page = Math.max(1, parseInt((qs.page || '1').toString(), 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt((qs.pageSize || '20').toString(), 10) || 20));
    const sortKeyRaw = (qs.sortKey || 'hts').toString();
    const sortDirRaw = (qs.sortDir || 'asc').toString();
    const sortKey = ['hts','list','rate','effective','action'].includes(sortKeyRaw) ? sortKeyRaw : 'hts';
    const sortDir = (sortDirRaw === 'desc') ? 'desc' : 'asc';

    const qDigits = qRaw.replace(/[^0-9]/g, '');

    const uniqueLists = Array.from(new Set(rows.map((r) => (r.list || '').toUpperCase()).filter(Boolean)));
    uniqueLists.sort((a, b) => {
      const order = ['1', '2', '3', '4', '4A', '4B'];
      const ai = order.indexOf(a);
      const bi = order.indexOf(b);
      if (ai === -1 && bi === -1) return a.localeCompare(b);
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });
    const uniqueRates = Array.from(new Set(rows.map((r) => (r.max_rate_text || '').trim()).filter(Boolean)));
    uniqueRates.sort((a, b) => {
      const na = parseFloat(a);
      const nb = parseFloat(b);
      if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
      return a.localeCompare(b);
    });

    let filtered = rows.slice();
    if (qDigits) {
      filtered = filtered.filter(r => r.hts_digits.startsWith(qDigits));
    }
    if (len === '8' || len === '10') {
      filtered = filtered.filter(r => String(r.hts_len) === len);
    }
    if (list) {
      if (list === 'NULL') filtered = filtered.filter(r => !r.list);
      else filtered = filtered.filter(r => (r.list || '').toUpperCase() === list);
    }
    if (rate) {
      if (rate.toUpperCase() === 'NULL') filtered = filtered.filter(r => !r.max_rate_text);
      else filtered = filtered.filter(r => (r.max_rate_text || '').toLowerCase() === rate.toLowerCase());
    }

    // Build helper accessors for sorting across the WHOLE dataset before pagination
    const getActionTitle = (r: any): string => {
      const ad = r?.raw?.action_description ? String(r.raw.action_description) : '';
      if (!ad) return '';
      const parts = ad.split(/\s[\u2013\-]\s/); // split by ' – ' or ' - '
      return String(parts[0] || '').trim();
    };
    const getListLabel = (r: any): string => {
      const ad = r?.raw?.action_description ? String(r.raw.action_description) : '';
      const m = ad.match(/\bList\s*(\d+|4A)\s*(\([^)]*\))?/i);
      if (m) return `List ${m[1].toUpperCase()}`; // base only for sorting/display
      return r.list ? `List ${r.list}` : '';
    };
    const getRateNum = (r: any): number => {
      const txt = String(r.max_rate_text || '');
      const m = txt.match(/(\d+(?:\.\d+)?)/);
      return m ? parseFloat(m[1]) : Number.NaN;
    };
    const getEffTime = (r: any): number => {
      const d = new Date(r.effective_date || 0).getTime();
      return Number.isFinite(d) ? d : 0;
    };

    const dir = sortDir === 'asc' ? 1 : -1;
    const sorted = [...filtered].sort((a, b) => {
      switch (sortKey) {
        case 'list':
          return (getListLabel(a).localeCompare(getListLabel(b)) || 0) * dir;
        case 'rate':
          return ((getRateNum(a) - getRateNum(b)) || 0) * dir;
        case 'effective':
          return ((getEffTime(a) - getEffTime(b)) || 0) * dir;
        case 'action':
          return (getActionTitle(a).localeCompare(getActionTitle(b)) || 0) * dir;
        case 'hts':
        default:
          return (a.hts_digits.localeCompare(b.hts_digits) || (b.hts_len - a.hts_len)) * dir;
      }
    });

    const total = sorted.length;
    const start = (page - 1) * pageSize;
    const items = sorted.slice(start, start + pageSize).map(r => {
      const ad = (r as any).raw?.action_description ? String((r as any).raw.action_description) : '';
      // Derive list + action based on rule:
      // If List exists -> List column顯示 List X；Action 顯示括號內（若有）。
      // 若無 List -> Action 顯示 '–' 之前完整文字。
      let action_title: string | null = null;
      let list_label: string | null = null; // full, e.g., 'List 4 (Modification)'
      let list_base: string | null = null;  // base, e.g., 'List 4'
      const mList = ad.match(/\bList\s*(\d+|4A)\s*(\([^)]*\))?/i);
      if (mList) {
        list_base = `List ${mList[1].toUpperCase()}`;
        list_label = `${list_base}${mList[2] ? ' ' + mList[2] : ''}`;
        if (mList[2]) action_title = String(mList[2]).replace(/[()]/g, '').trim() || null;
      } else if (r.list) {
        list_base = `List ${r.list}`;
        list_label = list_base;
      }
      if (!action_title && ad) {
        const parts = ad.split(/\s[\u2013\-]\s/); // ' – ' or ' - '
        action_title = (parts[0] || '').trim() || null;
      }
      return {
        hts: r.hts_digits,
        description: r.description,
        list: r.list,
        list_label,
        list_base,
        action_title,
        max_rate_text: r.max_rate_text,
        effective_date: r.effective_date,
        note: r.note || null,
      };
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        total,
        page,
        pageSize,
        sortKey,
        sortDir,
        sortApplied: 'global',
        listOptions: uniqueLists,
        rateOptions: uniqueRates,
        items,
      }, null, 2),
      headers: { 'Content-Type': 'application/json' }
    };
  } catch (err: any) {
    return { statusCode: 500, body: JSON.stringify({ success: false, message: err?.message || 'Internal error' }, null, 2) };
  }
};

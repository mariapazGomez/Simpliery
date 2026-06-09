/* ---------- persistence.jsx: auto-save all state to localStorage ---------- */

/* ── Serialise / deserialise dates in JSON ── */
const dateReviver = (_k, v)=>{
  if(typeof v==='string' && /^\d{4}-\d{2}-\d{2}T/.test(v)) return new Date(v);
  return v;
};
function lsGet(key, fallback){ try{ const raw=localStorage.getItem(key); return raw ? JSON.parse(raw, dateReviver) : fallback; } catch(e){ return fallback; } }
function lsSet(key, val){ try{ localStorage.setItem(key, JSON.stringify(val)); } catch(e){} }

/* ── Hook: auto-save a state value to localStorage ── */
function usePersisted(key, init){
  const [state, setState] = React.useState(()=> lsGet(key, typeof init==='function'?init():init));
  const set = React.useCallback((updater)=>{
    setState(prev=>{
      const next = typeof updater==='function'?updater(prev):updater;
      lsSet(key, next);
      return next;
    });
  },[key]);
  return [state, set];
}

Object.assign(window, { lsGet, lsSet, usePersisted, dateReviver });

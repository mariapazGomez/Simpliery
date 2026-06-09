/* ---------- exports.jsx: real CSV + plain text downloads ---------- */

/* ── Core download helper ── */
function downloadBlob(content, filename, mime='text/csv;charset=utf-8;'){
  const BOM = '\uFEFF'; // Excel-friendly UTF-8
  const blob = new Blob([BOM+content], {type:mime});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href=url; a.download=filename; a.style.display='none';
  document.body.appendChild(a); a.click();
  setTimeout(()=>{ URL.revokeObjectURL(url); document.body.removeChild(a); }, 500);
}

/* ── CSV builder ── */
function toCSV(rows, headers){
  const esc = v=>{ if(v===null||v===undefined) return ''; const s=String(v); return s.includes(',')||s.includes('"')||s.includes('\n')?`"${s.replace(/"/g,'""')}"`:s; };
  return [headers.join(','), ...rows.map(r=>headers.map(h=>esc(r[h])).join(','))].join('\n');
}

/* ── Export helpers ── */
function exportVentasCSV(sales, label='ventas'){
  const rows = sales.flatMap(s=> s.items.map(it=>({
    'Boleta':s.boleta,
    'Fecha':s.date.toLocaleDateString('es-CL'),
    'Hora':s.date.toLocaleTimeString('es-CL'),
    'Producto':it.name,
    'Categoría':it.cat,
    'Cantidad':it.qty,
    'Precio_unit':it.price,
    'Total_venta':it.price*it.qty,
    'Costo_unit':it.cost,
    'Costo_total':it.cost*it.qty,
    'Ganancia':((it.price-it.cost)*it.qty),
    'Metodo_pago':s.method,
    'Cliente':s.cliente?.nombre||'',
    'Tipo':s.tipo||'local',
  })));
  const hdrs=['Boleta','Fecha','Hora','Producto','Categoría','Cantidad','Precio_unit','Total_venta','Costo_unit','Costo_total','Ganancia','Metodo_pago','Cliente','Tipo'];
  downloadBlob(toCSV(rows,hdrs), `${label}_${new Date().toLocaleDateString('es-CL').replace(/\//g,'-')}.csv`);
}

function exportProductosCSV(products){
  const rows = products.map(p=>({
    'Nombre':p.name, 'Categoría':p.cat, 'Unidad':p.unit,
    'Costo':p.cost, 'Precio':p.price, 'Margen_$':p.margin,
    'Margen_%':p.marginPct, 'Stock':p.stock, 'Vendido':p.sold,
  }));
  downloadBlob(toCSV(rows,Object.keys(rows[0]||{})), `productos_${new Date().toLocaleDateString('es-CL').replace(/\//g,'-')}.csv`);
}

function exportClientesCSV(clientes){
  const rows = clientes.map(c=>({
    'Nombre':c.nombre,'Teléfono':c.telefono,'Correo':c.correo,
    'Ciudad':c.ciudad,'Dirección':c.direccion,'Total_compras':c.compras.length,
    'Total_gastado':c.totalGastado||0,'Ticket_promedio':c.ticketMedio||0,
    'Ultima_compra':c.compras.length>0?[...c.compras].sort((a,b)=>b.fecha-a.fecha)[0]?.fecha?.toLocaleDateString('es-CL'):'',
  }));
  downloadBlob(toCSV(rows,Object.keys(rows[0]||{})), `clientes_${new Date().toLocaleDateString('es-CL').replace(/\//g,'-')}.csv`);
}

function exportGastosCSV(gastos){
  const rows = gastos.map(g=>({
    'Fecha':g.fecha.toLocaleDateString('es-CL'),'Categoría':g.cat,'Descripción':g.desc,
    'Monto':g.monto,'Método':g.method,'Proveedor':g.proveedor,'Recurrente':g.recurrente?'Sí':'No','Estado':g.estado,
  }));
  downloadBlob(toCSV(rows,Object.keys(rows[0]||{})), `gastos_${new Date().toLocaleDateString('es-CL').replace(/\//g,'-')}.csv`);
}

function exportInventarioCSV(products){
  const rows = products.map(p=>({
    'Producto':p.name,'Categoría':p.cat,'Unidad':p.unit,
    'Stock_inicial':p.stock+p.sold,'Vendido':p.sold,'Stock_actual':p.stock,
    'Stock_mínimo':p.min,'Estado':p.stock<=0?'Sin stock':p.stock<=p.min?'Stock bajo':'OK',
    'Valor_stock':p.stock*p.cost,
  }));
  downloadBlob(toCSV(rows,Object.keys(rows[0]||{})), `inventario_${new Date().toLocaleDateString('es-CL').replace(/\//g,'-')}.csv`);
}

function exportListaReposicion(products){
  const bajos = products.filter(p=>p.stock<=p.min);
  if(!bajos.length){ alert('No hay productos por reponer'); return; }
  const rows = bajos.map(p=>({
    'Producto':p.name,'Categoría':p.cat,'Unidad':p.unit,
    'Stock_actual':p.stock,'Stock_mínimo':p.min,'Reponer_sugerido':Math.max(p.min*2-p.stock,p.min),
    'Costo_est':Math.max(p.min*2-p.stock,p.min)*p.cost,
  }));
  downloadBlob(toCSV(rows,Object.keys(rows[0]||{})), `lista_reposicion_${new Date().toLocaleDateString('es-CL').replace(/\//g,'-')}.csv`);
}

Object.assign(window, { downloadBlob, toCSV, exportVentasCSV, exportProductosCSV, exportClientesCSV, exportGastosCSV, exportInventarioCSV, exportListaReposicion });

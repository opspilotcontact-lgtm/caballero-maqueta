// Electrónica Caballero · propuesta. Sin librerías: buscador, cesta y encendidos.
(() => {
  const raiz = document.documentElement.dataset.raiz || './';
  const IMG = 'https://workcrm.com/clientesexternos/76e25814ae22ad63d695c525ce525dfc/imagesproductos/';
  const WA = '34663944088';
  const eur = n => n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
  const quita = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  document.documentElement.classList.remove('sin-js');

  // ---------- Buscador sobre el catálogo entero (nombre y referencia) ----------
  let indice = null, cargando = null;
  const carga = () => cargando ||= fetch(raiz + 'buscar.json').then(r => r.json()).then(d => {
    indice = d.map(([slug, nombre, ref, precio, stock, img, fam]) => ({ slug, nombre, ref, precio, stock, img, fam, k: quita(nombre + ' ' + ref) }));
  });
  const busca = q => {
    const t = quita(q).split(/\s+/).filter(Boolean);
    if (!t.length || !indice) return [];
    const r = [];
    for (const p of indice) {
      if (t.every(x => p.k.includes(x))) {
        const exacta = quita(p.ref) === t.join(' ');
        r.push([exacta ? 0 : p.stock ? 1 : 2, p]);
        if (r.length > 400) break;
      }
    }
    return r.sort((a, b) => a[0] - b[0]).slice(0, 12).map(x => x[1]);
  };
  document.querySelectorAll('[data-buscador]').forEach(caja => {
    const input = caja.querySelector('input');
    const lista = caja.querySelector('.resultados');
    let sel = -1;
    const pinta = () => {
      const q = input.value.trim();
      if (q.length < 2) { lista.classList.remove('abierto'); return; }
      const res = busca(q);
      sel = -1;
      lista.innerHTML = res.length
        ? res.map(p => `<a href="${raiz}${p.slug}/" role="option"><img src="${p.img ? IMG + p.img : raiz + 'img/sin-foto.svg'}" alt="" loading="lazy" width="44" height="44"><span>${p.nombre}<small>Ref. ${p.ref || '—'} · ${p.fam}</small></span><span class="precio">${eur(p.precio)}</span></a>`).join('')
          + `<a href="https://wa.me/${WA}?text=${encodeURIComponent('Hola, busco: ' + q)}" class="vacio">¿No es esto? Pregúntanos por WhatsApp: «${q.replace(/</g, '')}»</a>`
        : `<div class="vacio">No lo vemos en la web. <a href="https://wa.me/${WA}?text=${encodeURIComponent('Hola, busco: ' + q + '. ¿Lo tenéis o me lo podéis conseguir?')}">Mándanos una foto por WhatsApp</a> y te decimos si lo tenemos o te lo conseguimos.</div>`;
      lista.classList.add('abierto');
    };
    input.addEventListener('focus', () => carga().then(pinta));
    input.addEventListener('input', () => carga().then(pinta));
    input.addEventListener('keydown', e => {
      const items = [...lista.querySelectorAll('a')];
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault(); sel = Math.max(0, Math.min(items.length - 1, sel + (e.key === 'ArrowDown' ? 1 : -1)));
        items.forEach((a, i) => a.setAttribute('aria-selected', i === sel));
      } else if (e.key === 'Enter' && items[sel]) { e.preventDefault(); location.href = items[sel].href; }
      else if (e.key === 'Escape') lista.classList.remove('abierto');
    });
    document.addEventListener('click', e => { if (!caja.contains(e.target)) lista.classList.remove('abierto'); });
  });
  document.querySelectorAll('[data-busca]').forEach(b => b.addEventListener('click', e => {
    e.preventDefault();
    const input = document.querySelector('#buscador-portada input') || document.querySelector('[data-buscador] input');
    input.value = b.dataset.busca; input.focus(); input.dispatchEvent(new Event('input'));
  }));

  // ---------- Cesta (en este navegador) ----------
  const LLAVE = 'caballero-cesta';
  const lee = () => { try { return JSON.parse(localStorage.getItem(LLAVE)) || []; } catch { return []; } };
  const guarda = c => { try { localStorage.setItem(LLAVE, JSON.stringify(c)); } catch { } pintaCesta(); };
  const panel = document.getElementById('cesta');
  const pintaCesta = () => {
    const c = lee();
    const n = c.reduce((s, x) => s + x.u, 0);
    document.querySelectorAll('[data-cuenta]').forEach(b => b.textContent = n);
    if (!panel) return;
    const total = c.reduce((s, x) => s + x.u * x.precio, 0);
    panel.querySelector('.lineas').innerHTML = c.length
      ? c.map((x, i) => `<li><span>${x.nombre}<small>Ref. ${x.ref || '—'}</small></span><span class="u"><button data-menos="${i}" aria-label="Quitar una">−</button>${x.u}<button data-mas="${i}" aria-label="Añadir una">+</button></span><b>${eur(x.u * x.precio)}</b></li>`).join('')
      : '<li class="vacia">Tu cesta está vacía. Busca la pieza arriba o entra al mostrador.</li>';
    panel.querySelector('[data-total]').textContent = eur(total);
    const lineas = c.map(x => `• ${x.u} × ${x.nombre} (Ref. ${x.ref || '—'}) — ${eur(x.u * x.precio)}`).join('\n');
    const msg = modo => `Hola, quiero ${modo}:\n${lineas}\nTotal: ${eur(total)} (IVA incluido)`;
    panel.querySelector('[data-recoger]').href = `https://wa.me/${WA}?text=${encodeURIComponent(msg('reservarlo para RECOGER en la tienda (C/ San Francisco de Sales, 3)'))}`;
    panel.querySelector('[data-envio]').href = `https://wa.me/${WA}?text=${encodeURIComponent(msg('que me lo enviéis a casa'))}`;
    panel.querySelectorAll('[data-recoger],[data-envio]').forEach(a => a.toggleAttribute('aria-disabled', !c.length));
  };
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-anadir]');
    if (b) {
      const d = JSON.parse(b.dataset.anadir);
      const c = lee(); const x = c.find(y => y.slug === d.slug);
      x ? x.u++ : c.push({ ...d, u: 1 });
      guarda(c); b.textContent = 'Añadido ✓'; setTimeout(() => b.textContent = 'Añadir a la cesta', 1600);
      panel?.showModal?.();
    }
    const m = e.target.closest('[data-mas],[data-menos]');
    if (m) {
      const c = lee(); const i = +(m.dataset.mas ?? m.dataset.menos);
      c[i].u += m.dataset.mas !== undefined ? 1 : -1; if (c[i].u < 1) c.splice(i, 1); guarda(c);
    }
    if (e.target.closest('[data-abre-cesta]')) { e.preventDefault(); pintaCesta(); panel?.showModal?.(); }
    if (e.target.closest('[data-cierra-cesta]')) panel?.close();
  });
  pintaCesta();

  // ---------- Encendidos al entrar en pantalla (solo clases → opacidad/transform) ----------
  const io = 'IntersectionObserver' in window && new IntersectionObserver(es => es.forEach(en => {
    if (en.isIntersecting) { en.target.classList.add('dentro', 'viva'); io.unobserve(en.target); }
  }), { rootMargin: '0px 0px -12% 0px' });
  document.querySelectorAll('.entra,.vitrina,.soldar').forEach(el => io ? io.observe(el) : el.classList.add('dentro', 'viva'));

  // ---------- Ordenar y filtrar listados ----------
  const rej = document.querySelector('[data-listado]');
  if (rej) {
    const items = [...rej.children];
    const orden = document.getElementById('orden'), solo = document.getElementById('solo-stock');
    const aplica = () => {
      const o = orden.value;
      const v = items.filter(el => !solo.checked || el.dataset.stock === '1');
      v.sort((a, b) => o === 'pa' ? a.dataset.p - b.dataset.p : o === 'pd' ? b.dataset.p - a.dataset.p : o === 'az' ? a.dataset.n.localeCompare(b.dataset.n) : a.dataset.i - b.dataset.i);
      rej.replaceChildren(...v);
      document.querySelector('[data-cuenta-listado]').textContent = v.length;
    };
    orden?.addEventListener('change', aplica); solo?.addEventListener('change', aplica);
  }

  // ---------- «Trae tu pieza»: cargadores por voltios y amperios, agujas por modelo ----------
  const herr = document.querySelector('[data-herramienta]');
  if (herr) {
    const tabs = [...herr.querySelectorAll('[role=tab]')];
    tabs.forEach(t => t.addEventListener('click', () => {
      tabs.forEach(x => { x.setAttribute('aria-selected', x === t); document.getElementById(x.getAttribute('aria-controls')).hidden = x !== t; });
    }));
    const fila = (slug, nombre, extra, precio, stock, img) => `<li><a href="${raiz}${slug}/"><img src="${img ? IMG + img : ''}" alt="" loading="lazy" width="52" height="52"><span>${nombre}<small>${extra}${stock ? 'En stock' : 'Por encargo'}</small></span><b class="precio">${eur(precio)}</b></a></li>`;
    const carg = JSON.parse(document.getElementById('datos-cargadores').textContent);
    let volt = null;
    const amp = herr.querySelector('[data-amp]'), ampTxt = herr.querySelector('[data-amp-txt]'), resC = herr.querySelector('[data-res-carg]');
    const pintaC = () => {
      const a = +amp.value; ampTxt.textContent = a ? `${String(a).replace('.', ',')} A o más` : 'cualquiera';
      if (volt === null) return;
      const r = carg.filter(c => Math.abs(c[2] - volt) < 0.05 && (!a || (c[3] ?? 0) >= a)).sort((x, y) => y[6] - x[6] || (x[3] ?? 0) - (y[3] ?? 0));
      resC.innerHTML = r.length
        ? r.slice(0, 40).map(c => fila(c[0], c[1], `<span class="etq">${String(c[2]).replace('.', ',')} V</span>${c[3] ? `<span class="etq">${String(c[3]).replace('.', ',')} A</span>` : ''}${c[4] ? `<span class="etq">clavija ${c[4]}</span>` : ''}<br>`, c[5], c[6], c[7])).join('')
        : `<li class="vacio">Con esos datos no sale en la web. <a href="https://wa.me/${WA}?text=${encodeURIComponent(`Hola, busco un cargador de ${volt} V y al menos ${a} A. ¿Lo tenéis o me lo conseguís?`)}">Pregúntanos por WhatsApp</a>.</li>`;
    };
    herr.querySelectorAll('[data-v]').forEach(b => b.addEventListener('click', () => {
      herr.querySelectorAll('[data-v]').forEach(x => x.setAttribute('aria-pressed', x === b)); volt = +b.dataset.v; pintaC();
    }));
    amp.addEventListener('input', pintaC);
    const agu = JSON.parse(document.getElementById('datos-agujas').textContent).map(x => [...x, quita(x[1] + ' ' + x[2])]);
    const qA = herr.querySelector('[data-agu]'), resA = herr.querySelector('[data-res-agu]');
    qA.addEventListener('input', () => {
      const t = quita(qA.value).split(/\s+/).filter(Boolean);
      if (!t.length) return;
      const r = agu.filter(x => t.every(w => x[6].includes(w)));
      resA.innerHTML = r.length
        ? r.slice(0, 40).map(x => fila(x[0], x[1], x[2] ? `Ref. ${x[2]} · ` : '', x[3], x[4], x[5])).join('')
        : `<li class="vacio">No vemos «${qA.value.replace(/</g, '')}». <a href="https://wa.me/${WA}?text=${encodeURIComponent('Hola, busco aguja para: ' + qA.value)}">Mándanos foto de la cápsula</a> y te decimos cuál es.</li>`;
    });
  }
})();

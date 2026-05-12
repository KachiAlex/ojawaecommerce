(function(){
  const script = document.currentScript;
  const storeSlug = script?.dataset?.store || script?.getAttribute('data-store');
  const title = script?.dataset?.title || '';
  const limit = parseInt(script?.dataset?.limit || '12', 10);
  const base = 'https://us-central1-ojawa-ecommerce.cloudfunctions.net';
  const linkMode = (script?.dataset?.link || 'product').toLowerCase(); // 'product' | 'store'
  if (!storeSlug) { console.error('Ojawa Embed: data-store is required'); return; }

  const container = document.createElement('div');
  container.className = 'ojawa-store-embed';
  container.innerHTML = `
    <style>
      .ojawa-store-embed{font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Cantarell,Noto Sans,sans-serif;}
      .ojawa-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:16px}
      .ojawa-card{border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;background:#fff}
      .ojawa-img{width:100%;aspect-ratio:1/1;object-fit:cover;background:#f3f4f6}
      .ojawa-body{padding:10px}
      .ojawa-name{font-size:14px;line-height:1.2;margin:0 0 6px;color:#111827}
      .ojawa-price{font-weight:600;color:#065f46;margin-bottom:8px}
      .ojawa-btn{display:inline-block;padding:8px 10px;background:#059669;color:#fff;border-radius:8px;text-decoration:none;font-size:13px}
      .ojawa-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}
      .ojawa-title{font-weight:600;color:#111827;margin:0}
      .ojawa-brand{font-size:12px;color:#6b7280}
    </style>
    <div class="ojawa-head">
      <h3 class="ojawa-title">${title || 'Products'}</h3>
      <div class="ojawa-brand">Powered by Ojawa</div>
    </div>
    <div class="ojawa-grid" id="ojawa-grid"></div>
  `;
  script.parentNode.insertBefore(container, script.nextSibling);

  fetch(`${base}/storeProducts?slug=${encodeURIComponent(storeSlug)}&limit=${limit}`)
    .then(r=>r.json())
    .then(data=>{
      const grid=document.getElementById('ojawa-grid');
      if(!data||!Array.isArray(data.products)){grid.innerHTML='<div>Unable to load products.</div>';return;}
      grid.innerHTML='';
      data.products.forEach(p=>{
        const a=document.createElement('a');
        a.className='ojawa-card';
        a.href= linkMode==='store'
          ? `https://ojawa-ecommerce.web.app/store/${encodeURIComponent(storeSlug)}`
          : `https://ojawa-ecommerce.web.app/products/${encodeURIComponent(p.slug||p.id)}`;
        a.target='_blank';
        a.rel='noopener';
        a.innerHTML=`
          <img class="ojawa-img" src="${p.image||'/logos/ojawa-logo.png'}" alt="${p.name}">
          <div class="ojawa-body">
            <div class="ojawa-name">${p.name}</div>
            <div class="ojawa-price">${p.currency||'NGN'} ${Number(p.price||0).toLocaleString()}</div>
            <span class="ojawa-btn">Buy on Ojawa</span>
          </div>
        `;
        grid.appendChild(a);
      });
    })
    .catch(()=>{
      const grid=document.getElementById('ojawa-grid');
      if(grid) grid.innerHTML='<div>Unable to load products.</div>';
    });
})();



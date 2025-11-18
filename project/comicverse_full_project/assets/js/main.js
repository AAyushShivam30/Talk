// Main site JS: render pages, handle carousel, filters, cart (localStorage)
(function(){
  // Basic helpers
  const $ = (s, el=document)=> el.querySelector(s);
  const $$ = (s, el=document)=> Array.from(el.querySelectorAll(s));

  // CART utilities
  const CART_KEY = 'comicverse_cart_v1';
  function loadCart(){ try{ return JSON.parse(localStorage.getItem(CART_KEY)) || {}; }catch(e){return {} } }
  function saveCart(cart){ localStorage.setItem(CART_KEY, JSON.stringify(cart)); updateCartCount(); }
  function updateCartCount(){ const cart=loadCart(); const count = Object.values(cart).reduce((s,i)=>s+i.qty,0); $$('#cart-count').forEach(el=>el.textContent=`(${count})`)}

  // Render small card
  function makeCard(comic){
    const div = document.createElement('div'); div.className='card';
    div.innerHTML = `
      <a href="comic-detail.html?id=${comic.id}"><img src="${comic.cover}" alt="${comic.title}"></a>
      <h3>${comic.title}</h3>
      <p class="muted">${comic.publisher} • $${comic.price.toFixed(2)}</p>
      <div style="display:flex;gap:8px;margin-top:8px">
        <button class="btn" data-add="${comic.id}">Add</button>
        <a href="comic-detail.html?id=${comic.id}" class="btn" style="background:#444">Details</a>
      </div>
    `;
    return div;
  }

  // PAGE: Home
  function initHome(){
    const hero = $('#hero-carousel');
    if(!hero) return;
    // populate slides from COMICS (featured first 3)
    const slides = COMICS.slice(0,3);
    slides.forEach(c=>{
      const slide = document.createElement('div'); slide.className='slide';
      slide.style.backgroundImage = `url(${c.cover})`;
      slide.innerHTML = `<h3>${c.title} — ${c.publisher}</h3>`;
      hero.appendChild(slide);
    });
    // new releases
    const nr = $('#new-releases');
    COMICS.sort((a,b)=> new Date(b.releaseDate)-new Date(a.releaseDate)).slice(0,4).forEach(c=> nr.appendChild(makeCard(c)));
    const ps = $('#popular-series');
    COMICS.slice(0,4).forEach(c=> ps.appendChild(makeCard(c)));

    // Carousel controls
    let idx=0; const slidesEl = hero;
    function show(i){ slidesEl.style.transform = `translateX(-${i*100}%)`; }
    document.querySelectorAll('.carousel-btn.prev').forEach(b=> b.addEventListener('click',()=>{ idx=(idx-1+slides.length)%slides.length; show(idx)}));
    document.querySelectorAll('.carousel-btn.next').forEach(b=> b.addEventListener('click',()=>{ idx=(idx+1)%slides.length; show(idx)}));
    // auto rotate
    setInterval(()=>{ idx=(idx+1)%slides.length; show(idx)},5000);
  }

  // PAGE: Browse
  function initBrowse(){
    const grid = $('#browse-grid');
    if(!grid) return;
    // populate filter options
    const pubSel = $('#filter-publisher');
    const genreSel = $('#filter-genre');
    const pubs = Array.from(new Set(COMICS.map(c=>c.publisher))); pubs.forEach(p=> pubSel.appendChild(new Option(p,p)));
    const genres = Array.from(new Set(COMICS.map(c=>c.genre))); genres.forEach(g=> genreSel.appendChild(new Option(g,g)));

    function renderList(list){ grid.innerHTML=''; list.forEach(c=> grid.appendChild(makeCard(c)))}
    renderList(COMICS);

    // interactions
    $('#filter-publisher').addEventListener('change', applyFilters);
    $('#filter-genre').addEventListener('change', applyFilters);
    $('#sort-by').addEventListener('change', applyFilters);
    $('#search-input').addEventListener('input', applyFilters);

    function applyFilters(){
      const pub = pubSel.value; const gen = genreSel.value; const sort = $('#sort-by').value; const q = $('#search-input').value.trim().toLowerCase();
      let list = COMICS.slice();
      if(pub!=='all') list = list.filter(c=>c.publisher===pub);
      if(gen!=='all') list = list.filter(c=>c.genre===gen);
      if(q) list = list.filter(c=> c.title.toLowerCase().includes(q) || (c.characters||[]).join(' ').toLowerCase().includes(q));
      if(sort==='price-asc') list.sort((a,b)=>a.price-b.price);
      if(sort==='title-asc') list.sort((a,b)=> a.title.localeCompare(b.title));
      if(sort==='date-desc') list.sort((a,b)=> new Date(b.releaseDate)-new Date(a.releaseDate));
      renderList(list);
    }
  }

  // PAGE: Detail
  function initDetail(){
    const titleEl = $('#detail-title'); if(!titleEl) return;
    const params = new URLSearchParams(location.search); const id = params.get('id');
    const comic = COMICS.find(c=>c.id===id);
    if(!comic){ titleEl.textContent='Comic Not Found'; return; }
    $('#detail-cover').src = comic.cover;
    $('#detail-title').textContent = comic.title;
    $('#detail-publisher').textContent = comic.publisher + ' • ' + comic.genre;
    $('#detail-creators').textContent = 'Creators: ' + comic.creators;
    $('#detail-synopsis').textContent = comic.synopsis;
    $('#detail-price').textContent = '$' + comic.price.toFixed(2);

    $('#add-to-cart').addEventListener('click', ()=>{
      const qty = Math.max(1, parseInt($('#qty').value)||1);
      const cart = loadCart();
      if(cart[comic.id]) cart[comic.id].qty += qty; else cart[comic.id] = { id:comic.id, qty, title:comic.title, price:comic.price, cover:comic.cover };
      saveCart(cart);
      alert('Added to cart');
    });
  }

  // PAGE: Cart
  function initCart(){
    const container = $('#cart-contents'); if(!container) return;
    function render(){
      const cart = loadCart(); container.innerHTML='';
      const items = Object.values(cart);
      if(items.length===0) { container.innerHTML='<p>Your cart is empty.</p>'; $('#cart-total').textContent='$0.00'; return; }
      let total=0;
      items.forEach(it=>{
        total += it.price * it.qty;
        const div = document.createElement('div'); div.className='cart-item';
        div.innerHTML = `
          <img src="${it.cover}" alt="${it.title}">
          <div style="flex:1">
            <div style="font-weight:700">${it.title}</div>
            <div class="muted">$${it.price.toFixed(2)} each</div>
          </div>
          <div>
            <input type="number" min="1" value="${it.qty}" data-id="${it.id}" style="width:64px">
            <div style="margin-top:8px"><button data-remove="${it.id}" class="btn">Remove</button></div>
          </div>
        `;
        container.appendChild(div);
      });
      $('#cart-total').textContent = '$' + total.toFixed(2);

      // attach events
      container.querySelectorAll('input[type="number"]').forEach(inp=> inp.addEventListener('change', (e)=>{
        const id = e.target.dataset.id; const val = Math.max(1, parseInt(e.target.value)||1); const cart = loadCart(); if(cart[id]){ cart[id].qty = val; saveCart(cart); render(); }
      }));
      container.querySelectorAll('[data-remove]').forEach(btn=> btn.addEventListener('click', (e)=>{ const id=e.target.dataset.remove; const cart=loadCart(); delete cart[id]; saveCart(cart); render(); }));
    }
    render();

    $('#checkout').addEventListener('click', ()=>{
      // simulated checkout
      localStorage.removeItem(CART_KEY); updateCartCount(); alert('Thank you for your simulated order!'); location.href='index.html';
    });
  }

  // Global add-to-cart handlers (used on multiple pages)
  function globalAddHandlers(){
    document.addEventListener('click', (e)=>{
      const add = e.target.closest('[data-add]'); if(!add) return; const id = add.dataset.add; const comic = COMICS.find(c=>c.id===id); if(!comic) return;
      const cart = loadCart(); if(cart[id]) cart[id].qty += 1; else cart[id] = { id:comic.id, qty:1, title:comic.title, price:comic.price, cover:comic.cover };
      saveCart(cart); alert('Added to cart');
    });
  }

  // Init per page
  document.addEventListener('DOMContentLoaded', ()=>{
    updateCartCount(); globalAddHandlers(); initHome(); initBrowse(); initDetail(); initCart();

    // hamburger
    document.querySelectorAll('.hamburger').forEach(b=> b.addEventListener('click', ()=>{ const nav=document.querySelector('.nav'); if(nav) nav.style.display = nav.style.display==='flex'?'none':'flex'; }));
  });
})();
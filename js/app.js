(() => {
  'use strict';

  const CART_KEY = 'ziarno-cart';
  const FREE_SHIPPING = 150;
  const SHIPPING_COST = 14.99;

  const app = document.getElementById('app');
  const cartCountEl = document.getElementById('cart-count');
  const toastEl = document.getElementById('toast');
  const searchForm = document.getElementById('search-form');
  const searchInput = document.getElementById('search-input');

  const byId = Object.fromEntries(PRODUCTS.map(p => [p.id, p]));
  const catName = Object.fromEntries(CATEGORIES.map(c => [c.id, c.name]));

  const state = { category: 'all', sort: 'featured', query: '' };

  // ---------- Pomocnicze ----------

  const fmt = n => n.toLocaleString('pl-PL', { style: 'currency', currency: 'PLN' });

  const esc = s => String(s).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const stars = r => '★'.repeat(Math.round(r)) + '☆'.repeat(5 - Math.round(r));

  let toastTimer;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toastEl.hidden = true; }, 2200);
  }

  function productImage(p, cls = '') {
    return `<div class="product-img ${cls}" style="--c:${p.color}"><span>${p.emoji}</span></div>`;
  }

  // ---------- Koszyk (localStorage) ----------

  function loadCart() {
    try {
      const raw = JSON.parse(localStorage.getItem(CART_KEY)) || {};
      return Object.fromEntries(Object.entries(raw).filter(([id, q]) => byId[id] && q > 0));
    } catch { return {}; }
  }

  let cart = loadCart();

  function saveCart() {
    try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch { /* tryb prywatny */ }
    updateCartCount();
  }

  function addToCart(id, qty = 1) {
    const p = byId[id];
    if (!p || p.stock === 0) return;
    cart[id] = Math.min((cart[id] || 0) + qty, p.stock);
    saveCart();
    toast(`Dodano do koszyka: ${p.name}`);
  }

  function setQty(id, qty) {
    if (qty <= 0) delete cart[id];
    else cart[id] = Math.min(qty, byId[id].stock);
    saveCart();
  }

  function cartItems() {
    return Object.entries(cart).map(([id, qty]) => ({ product: byId[id], qty }));
  }

  function cartTotals() {
    const subtotal = cartItems().reduce((s, i) => s + i.product.price * i.qty, 0);
    const shipping = subtotal === 0 || subtotal >= FREE_SHIPPING ? 0 : SHIPPING_COST;
    return { subtotal, shipping, total: subtotal + shipping };
  }

  function updateCartCount() {
    const count = Object.values(cart).reduce((a, b) => a + b, 0);
    cartCountEl.textContent = count;
    cartCountEl.hidden = count === 0;
  }

  // ---------- Widoki ----------

  function productCard(p) {
    const out = p.stock === 0;
    return `
      <article class="card">
        <a href="#/produkt/${p.id}" class="card-link">
          ${productImage(p)}
          ${p.oldPrice ? '<span class="badge badge-sale">Promocja</span>' : ''}
          ${out ? '<span class="badge badge-out">Brak</span>' : ''}
          <div class="card-body">
            <span class="card-cat">${esc(catName[p.category])}</span>
            <h3>${esc(p.name)}</h3>
            <span class="rating" title="${p.rating}/5">${stars(p.rating)}</span>
          </div>
        </a>
        <div class="card-footer">
          <div class="price">
            ${fmt(p.price)}
            ${p.oldPrice ? `<s>${fmt(p.oldPrice)}</s>` : ''}
          </div>
          <button class="btn btn-small" data-add="${p.id}" ${out ? 'disabled' : ''}>
            ${out ? 'Niedostępny' : 'Do koszyka'}
          </button>
        </div>
      </article>`;
  }

  function renderCatalog() {
    const q = state.query.trim().toLowerCase();
    let list = PRODUCTS.filter(p =>
      (state.category === 'all' || p.category === state.category) &&
      (!q || p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)));

    const sorters = {
      featured: () => 0,
      'price-asc': (a, b) => a.price - b.price,
      'price-desc': (a, b) => b.price - a.price,
      rating: (a, b) => b.rating - a.rating,
      name: (a, b) => a.name.localeCompare(b.name, 'pl'),
    };
    list = [...list].sort(sorters[state.sort]);

    const chips = [{ id: 'all', name: 'Wszystko' }, ...CATEGORIES].map(c =>
      `<button class="chip ${state.category === c.id ? 'active' : ''}" data-cat="${c.id}">${esc(c.name)}</button>`).join('');

    app.innerHTML = `
      ${!q && state.category === 'all' ? `
      <section class="hero">
        <div>
          <h1>Świeżo palona kawa<br>i herbaty z całego świata</h1>
          <p>Palimy co tydzień, wysyłamy w 24 h. Darmowa dostawa od ${fmt(FREE_SHIPPING)}.</p>
          <a href="#/" class="btn" data-cat-link="kawa">Zobacz kawy</a>
        </div>
        <div class="hero-art" aria-hidden="true">☕</div>
      </section>` : ''}
      <section class="toolbar">
        <div class="chips">${chips}</div>
        <label class="sort">Sortuj:
          <select id="sort">
            <option value="featured">Polecane</option>
            <option value="price-asc">Cena rosnąco</option>
            <option value="price-desc">Cena malejąco</option>
            <option value="rating">Najwyżej oceniane</option>
            <option value="name">Nazwa A–Z</option>
          </select>
        </label>
      </section>
      ${q ? `<p class="muted">Wyniki dla „${esc(state.query)}”: ${list.length}</p>` : ''}
      ${list.length
        ? `<section class="grid">${list.map(productCard).join('')}</section>`
        : `<div class="empty"><p>Brak produktów spełniających kryteria.</p><button class="btn btn-ghost" data-reset>Wyczyść filtry</button></div>`}
    `;
    app.querySelector('#sort').value = state.sort;
  }

  function renderProduct(id) {
    const p = byId[id];
    if (!p) return renderNotFound();
    const out = p.stock === 0;
    const related = PRODUCTS.filter(x => x.category === p.category && x.id !== p.id).slice(0, 4);

    app.innerHTML = `
      <nav class="breadcrumbs"><a href="#/">Sklep</a> / <a href="#/" data-cat-link="${p.category}">${esc(catName[p.category])}</a> / ${esc(p.name)}</nav>
      <section class="product-page">
        ${productImage(p, 'large')}
        <div class="product-info">
          <span class="card-cat">${esc(catName[p.category])}</span>
          <h1>${esc(p.name)}</h1>
          <span class="rating">${stars(p.rating)} <small>${p.rating.toFixed(1)}</small></span>
          <div class="price big">${fmt(p.price)} ${p.oldPrice ? `<s>${fmt(p.oldPrice)}</s>` : ''}</div>
          <p>${esc(p.description)}</p>
          <ul class="details">${p.details.map(d => `<li>${esc(d)}</li>`).join('')}</ul>
          <p class="stock ${out ? 'out' : p.stock < 6 ? 'low' : ''}">
            ${out ? 'Chwilowo niedostępny' : p.stock < 6 ? `Ostatnie sztuki (${p.stock})` : 'Dostępny'}
          </p>
          <div class="buy-row">
            <div class="qty">
              <button type="button" data-step="-1" aria-label="Mniej">−</button>
              <input type="number" id="qty" value="1" min="1" max="${p.stock}" ${out ? 'disabled' : ''} aria-label="Ilość">
              <button type="button" data-step="1" aria-label="Więcej">+</button>
            </div>
            <button class="btn" id="add-detail" ${out ? 'disabled' : ''}>Dodaj do koszyka</button>
          </div>
        </div>
      </section>
      ${related.length ? `<h2>Może Ci się spodobać</h2><section class="grid">${related.map(productCard).join('')}</section>` : ''}
    `;

    const qtyInput = app.querySelector('#qty');
    app.querySelectorAll('[data-step]').forEach(b => b.addEventListener('click', () => {
      const v = (parseInt(qtyInput.value, 10) || 1) + Number(b.dataset.step);
      qtyInput.value = Math.max(1, Math.min(v, p.stock || 1));
    }));
    app.querySelector('#add-detail').addEventListener('click', () => {
      addToCart(p.id, Math.max(1, parseInt(qtyInput.value, 10) || 1));
    });
  }

  function summaryBox(withButton) {
    const t = cartTotals();
    const missing = FREE_SHIPPING - t.subtotal;
    return `
      <aside class="summary">
        <h2>Podsumowanie</h2>
        <dl>
          <dt>Produkty</dt><dd>${fmt(t.subtotal)}</dd>
          <dt>Dostawa</dt><dd>${t.shipping ? fmt(t.shipping) : 'Gratis'}</dd>
          <dt class="total">Razem</dt><dd class="total">${fmt(t.total)}</dd>
        </dl>
        ${missing > 0 ? `<p class="hint">Dodaj produkty za ${fmt(missing)}, aby otrzymać darmową dostawę.</p>` : ''}
        ${withButton ? '<a href="#/zamowienie" class="btn btn-block">Przejdź do kasy</a>' : ''}
      </aside>`;
  }

  function renderCart() {
    const items = cartItems();
    if (!items.length) {
      app.innerHTML = `
        <h1>Koszyk</h1>
        <div class="empty"><p>Twój koszyk jest pusty.</p><a href="#/" class="btn">Wróć do sklepu</a></div>`;
      return;
    }
    app.innerHTML = `
      <h1>Koszyk</h1>
      <div class="cart-layout">
        <ul class="cart-list">
          ${items.map(({ product: p, qty }) => `
            <li class="cart-item">
              <a href="#/produkt/${p.id}">${productImage(p, 'thumb')}</a>
              <div class="cart-item-info">
                <a href="#/produkt/${p.id}"><strong>${esc(p.name)}</strong></a>
                <span class="muted">${fmt(p.price)} / szt.</span>
              </div>
              <div class="qty">
                <button type="button" data-cart-step="-1" data-id="${p.id}" aria-label="Mniej">−</button>
                <input type="number" value="${qty}" min="1" max="${p.stock}" data-cart-qty="${p.id}" aria-label="Ilość">
                <button type="button" data-cart-step="1" data-id="${p.id}" aria-label="Więcej">+</button>
              </div>
              <strong class="line-total">${fmt(p.price * qty)}</strong>
              <button class="remove" data-remove="${p.id}" aria-label="Usuń">✕</button>
            </li>`).join('')}
        </ul>
        ${summaryBox(true)}
      </div>`;
  }

  function renderCheckout() {
    if (!cartItems().length) { location.hash = '#/koszyk'; return; }
    app.innerHTML = `
      <h1>Zamówienie</h1>
      <div class="cart-layout">
        <form id="checkout" class="checkout" novalidate>
          <fieldset>
            <legend>Dane do wysyłki</legend>
            <div class="row">
              <label>Imię<input name="firstName" required autocomplete="given-name"></label>
              <label>Nazwisko<input name="lastName" required autocomplete="family-name"></label>
            </div>
            <label>E-mail<input name="email" type="email" required autocomplete="email"></label>
            <label>Telefon<input name="phone" type="tel" pattern="[0-9 +\\-]{9,}" required autocomplete="tel"></label>
            <label>Ulica i numer<input name="street" required autocomplete="street-address"></label>
            <div class="row">
              <label>Kod pocztowy<input name="zip" pattern="\\d{2}-\\d{3}" placeholder="00-000" required autocomplete="postal-code"></label>
              <label>Miasto<input name="city" required autocomplete="address-level2"></label>
            </div>
          </fieldset>
          <fieldset>
            <legend>Dostawa</legend>
            <label class="radio"><input type="radio" name="delivery" value="kurier" checked> Kurier (1–2 dni)</label>
            <label class="radio"><input type="radio" name="delivery" value="paczkomat"> Paczkomat</label>
            <label class="radio"><input type="radio" name="delivery" value="odbior"> Odbiór osobisty</label>
          </fieldset>
          <fieldset>
            <legend>Płatność</legend>
            <label class="radio"><input type="radio" name="payment" value="blik" checked> BLIK</label>
            <label class="radio"><input type="radio" name="payment" value="przelew"> Szybki przelew</label>
            <label class="radio"><input type="radio" name="payment" value="pobranie"> Za pobraniem</label>
          </fieldset>
          <label class="radio"><input type="checkbox" name="terms" required> Akceptuję regulamin sklepu (makieta)</label>
          <p class="form-error" id="form-error" hidden>Uzupełnij poprawnie zaznaczone pola.</p>
          <button class="btn btn-block" type="submit">Zamawiam i płacę</button>
          <p class="muted small">To makieta — żadne dane nie są nigdzie wysyłane.</p>
        </form>
        ${summaryBox(false)}
      </div>`;

    const form = app.querySelector('#checkout');
    form.addEventListener('submit', e => {
      e.preventDefault();
      form.classList.add('validated');
      if (!form.checkValidity()) {
        app.querySelector('#form-error').hidden = false;
        form.querySelector(':invalid')?.focus();
        return;
      }
      const order = {
        number: 'ZI-' + Date.now().toString(36).toUpperCase(),
        name: form.firstName.value.trim(),
        email: form.email.value.trim(),
        total: cartTotals().total,
      };
      sessionStorage.setItem('ziarno-last-order', JSON.stringify(order));
      cart = {};
      saveCart();
      location.hash = '#/dziekujemy';
    });
  }

  function renderThanks() {
    let order = null;
    try { order = JSON.parse(sessionStorage.getItem('ziarno-last-order')); } catch { /* brak */ }
    if (!order) { location.hash = '#/'; return; }
    app.innerHTML = `
      <div class="thanks">
        <div class="thanks-icon">✔</div>
        <h1>Dziękujemy, ${esc(order.name)}!</h1>
        <p>Zamówienie <strong>${esc(order.number)}</strong> na kwotę <strong>${fmt(order.total)}</strong> zostało przyjęte.</p>
        <p class="muted">Potwierdzenie „wysłaliśmy” na ${esc(order.email)} (to tylko makieta).</p>
        <a href="#/" class="btn">Wróć do sklepu</a>
      </div>`;
  }

  function renderNotFound() {
    app.innerHTML = `<div class="empty"><h1>404</h1><p>Nie znaleziono strony.</p><a href="#/" class="btn">Strona główna</a></div>`;
  }

  // ---------- Router (hash — działa na GitHub Pages bez konfiguracji) ----------

  function route() {
    const [, page, param] = (location.hash.replace(/^#/, '') || '/').split('/');
    switch (page || '') {
      case '': renderCatalog(); break;
      case 'produkt': renderProduct(param); break;
      case 'koszyk': renderCart(); break;
      case 'zamowienie': renderCheckout(); break;
      case 'dziekujemy': renderThanks(); break;
      default: renderNotFound();
    }
    window.scrollTo(0, 0);
  }

  // ---------- Zdarzenia (delegacja) ----------

  app.addEventListener('click', e => {
    const t = e.target.closest('button, a');
    if (!t) return;

    if (t.dataset.add) addToCart(t.dataset.add);

    if (t.dataset.cat) { state.category = t.dataset.cat; renderCatalog(); }

    if (t.dataset.catLink) {
      e.preventDefault();
      state.category = t.dataset.catLink;
      state.query = searchInput.value = '';
      if (location.hash === '#/' || location.hash === '') renderCatalog();
      else location.hash = '#/';
    }

    if ('reset' in t.dataset) {
      state.category = 'all';
      state.query = searchInput.value = '';
      renderCatalog();
    }

    if (t.dataset.remove) { setQty(t.dataset.remove, 0); renderCart(); }

    if (t.dataset.cartStep) {
      const id = t.dataset.id;
      setQty(id, (cart[id] || 0) + Number(t.dataset.cartStep));
      renderCart();
    }
  });

  app.addEventListener('change', e => {
    if (e.target.id === 'sort') { state.sort = e.target.value; renderCatalog(); }
    if (e.target.dataset.cartQty) {
      setQty(e.target.dataset.cartQty, parseInt(e.target.value, 10) || 0);
      renderCart();
    }
  });

  searchInput.addEventListener('input', () => {
    state.query = searchInput.value;
    if (location.hash.startsWith('#/') && location.hash.length > 2) location.hash = '#/';
    else renderCatalog();
  });
  searchForm.addEventListener('submit', e => e.preventDefault());

  window.addEventListener('hashchange', route);
  window.addEventListener('storage', e => { if (e.key === CART_KEY) { cart = loadCart(); updateCartCount(); } });

  updateCartCount();
  route();
})();

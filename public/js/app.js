const state = {
  menu: [],
  cart: new Map() // name -> { name, price, qty }
};

const CATEGORY_ICONS = {
  'Bratwurst, Pommes & Co': '🌭',
  'Pommes Frites & Co': '🍟',
  'Leckere Schnitzel': '🍽️',
  'Hähnchengerichte': '🍗',
  'Gyros': '🥙',
  'Saucen': '🥫',
  'Salate': '🥗'
};

function money(n) {
  return n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}

async function loadMenu() {
  const res = await fetch('/api/menu');
  state.menu = await res.json();
  renderPopular();
  renderMenu();
}

function renderPopular() {
  const popularItems = [];
  state.menu.forEach((cat) => {
    cat.items.forEach((item) => {
      item._category = cat.category;
      if (item.popular) popularItems.push(item);
    });
  });

  const existing = document.getElementById('popularSection');
  if (existing) existing.remove();
  if (popularItems.length === 0) return;

  const section = document.createElement('section');
  section.className = 'popular-section';
  section.id = 'popularSection';
  section.innerHTML = `
    <h2>⭐ Beliebte Gerichte</h2>
    <p class="sub">Das bestellen unsere Kunden am liebsten</p>
    <div class="popular-scroll"></div>
  `;
  const scroll = section.querySelector('.popular-scroll');

  popularItems.forEach((item) => {
    const card = document.createElement('div');
    card.className = 'popular-card';
    const imgTag = item.img
      ? `<img class="thumb" src="/img/${escapeAttr(item.img)}" alt="${escapeAttr(item.name)}" onerror="this.remove()">`
      : '';
    card.innerHTML = `
      <div class="thumb-wrap">
        ${imgTag}
        <div class="thumb-fallback">${CATEGORY_ICONS[item._category] || '🍴'}</div>
        <span class="badge">Beliebt</span>
      </div>
      <div class="body">
        <div class="pname">${item.name}</div>
        <div class="pprice">${money(item.price)}</div>
        <button class="btn-add-mini">In den Warenkorb</button>
      </div>
    `;
    if (item.img) {
      const img = card.querySelector('.thumb');
      const fallback = card.querySelector('.thumb-fallback');
      img.addEventListener('load', () => fallback.remove());
      img.addEventListener('error', () => img.remove());
    }
    card.querySelector('.btn-add-mini').onclick = () => {
      const inCart = state.cart.get(item.name);
      if (inCart) inCart.qty += 1;
      else state.cart.set(item.name, { name: item.name, price: item.price, qty: 1 });
      updateCartBar();
      renderMenu();
    };
    scroll.appendChild(card);
  });

  document.getElementById('menu').before(section);
}

function renderMenu() {
  const main = document.getElementById('menu');
  main.innerHTML = '';
  state.menu.forEach((cat) => {
    const section = document.createElement('section');
    section.className = 'category';
    const h2 = document.createElement('h2');
    h2.innerHTML = `<span class="cat-icon">${CATEGORY_ICONS[cat.category] || '🍴'}</span> ${cat.category}`;
    section.appendChild(h2);

    cat.items.forEach((item) => {
      item._category = cat.category;
      const row = document.createElement('div');
      row.className = 'item';
      row.innerHTML = `
        <div>
          <div class="name">${item.name}</div>
          <span class="price">${money(item.price)}</span>
        </div>
        <div class="controls" data-name="${escapeAttr(item.name)}"></div>
      `;
      section.appendChild(row);
      renderItemControls(row.querySelector('.controls'), item);
    });

    main.appendChild(section);
  });
}

function escapeAttr(s) {
  return s.replace(/"/g, '&quot;');
}

function renderItemControls(el, item) {
  const inCart = state.cart.get(item.name);
  if (!inCart) {
    el.innerHTML = `<button class="btn-add" aria-label="Hinzufügen">+</button>`;
    el.querySelector('.btn-add').onclick = () => {
      state.cart.set(item.name, { name: item.name, price: item.price, qty: 1, note: '' });
      renderItemControls(el, item);
      updateCartBar();
    };
  } else {
    el.innerHTML = `
      <div class="qty-controls">
        <button class="minus">−</button>
        <span class="qty">${inCart.qty}</span>
        <button class="plus">+</button>
      </div>
    `;
    el.querySelector('.plus').onclick = () => {
      inCart.qty += 1;
      renderItemControls(el, item);
      updateCartBar();
    };
    el.querySelector('.minus').onclick = () => {
      inCart.qty -= 1;
      if (inCart.qty <= 0) state.cart.delete(item.name);
      renderItemControls(el, item);
      updateCartBar();
    };
  }
}

function cartTotal() {
  let total = 0;
  state.cart.forEach((it) => (total += it.price * it.qty));
  return total;
}

function cartCount() {
  let count = 0;
  state.cart.forEach((it) => (count += it.qty));
  return count;
}

function updateCartBar() {
  const bar = document.getElementById('cartBar');
  const count = cartCount();
  if (count === 0) {
    bar.classList.add('hidden');
  } else {
    bar.classList.remove('hidden');
    document.getElementById('cartCount').textContent = count;
    document.getElementById('cartTotal').textContent = money(cartTotal());
  }
  renderCartLines();
}

function renderCartLines() {
  const container = document.getElementById('cartLines');
  container.innerHTML = '';
  if (state.cart.size === 0) {
    container.innerHTML = '<p style="color:#888">Dein Warenkorb ist leer.</p>';
  }
  state.cart.forEach((it) => {
    const line = document.createElement('div');
    line.className = 'cart-line-block';
    line.innerHTML = `
      <div class="cart-line">
        <span class="name">${it.qty} × ${it.name}</span>
        <span class="line-total">${money(it.price * it.qty)}</span>
        <button class="remove" aria-label="Entfernen">×</button>
      </div>
      <input type="text" class="line-note" maxlength="120" placeholder="Notiz zu diesem Artikel, z. B. ohne Zwiebeln" value="${escapeAttr(it.note || '')}">
    `;
    line.querySelector('.remove').onclick = () => {
      state.cart.delete(it.name);
      renderMenu();
      updateCartBar();
    };
    line.querySelector('.line-note').oninput = (e) => {
      it.note = e.target.value;
    };
    container.appendChild(line);
  });
  document.getElementById('modalTotal').textContent = money(cartTotal());
}

function openCart() {
  document.getElementById('cartModal').classList.remove('hidden');
}
function closeCart() {
  document.getElementById('cartModal').classList.add('hidden');
}

function showError(msg) {
  const box = document.getElementById('errorBox');
  box.textContent = msg;
  box.classList.add('show');
}
function hideError() {
  document.getElementById('errorBox').classList.remove('show');
}

async function submitOrder(e) {
  e.preventDefault();
  hideError();

  if (state.cart.size === 0) {
    showError('Dein Warenkorb ist leer.');
    return;
  }

  const customerName = document.getElementById('customerName').value.trim();
  const phone = document.getElementById('phone').value.trim();
  const wishTime = document.getElementById('wishTime').value;
  const note = document.getElementById('note').value.trim();

  const items = Array.from(state.cart.values()).map((it) => ({
    name: it.name,
    qty: it.qty,
    note: (it.note || '').trim()
  }));

  const btn = document.getElementById('submitBtn');
  btn.disabled = true;
  btn.textContent = 'Wird gesendet …';

  try {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items, customerName, phone, wishTime, note })
    });
    const data = await res.json();
    if (!res.ok) {
      showError(data.error || 'Etwas ist schiefgelaufen.');
      btn.disabled = false;
      btn.textContent = 'Verbindlich bestellen';
      return;
    }

    localStorage.setItem(
      'lastOrder',
      JSON.stringify({ orderNumber: data.orderNumber, code: data.code })
    );
    window.location.href = `status.html?nr=${data.orderNumber}&code=${data.code}`;
  } catch (err) {
    showError('Verbindung fehlgeschlagen. Bitte versuche es erneut.');
    btn.disabled = false;
    btn.textContent = 'Verbindlich bestellen';
  }
}

document.getElementById('openCartBtn').onclick = openCart;
document.getElementById('closeCartBtn').onclick = closeCart;
document.getElementById('checkoutForm').onsubmit = submitOrder;

loadMenu();

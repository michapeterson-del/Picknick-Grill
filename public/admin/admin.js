let filter = 'offen';
let pollTimer = null;

function money(n) {
  return n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}

function fmtTime(iso) {
  const d = new Date(iso);
  return d.toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

async function checkSession() {
  const res = await fetch('/admin/api/session');
  const data = await res.json();
  if (!data.isAdmin) {
    window.location.href = 'login.html';
    return false;
  }
  return true;
}

async function loadOrders() {
  const res = await fetch('/admin/api/orders');
  if (res.status === 401) {
    window.location.href = 'login.html';
    return;
  }
  const orders = await res.json();
  render(orders);
}

function render(orders) {
  const container = document.getElementById('orders');
  const filtered = orders.filter((o) => {
    if (filter === 'alle') return true;
    return o.status === 'neu' || o.status === 'bestaetigt';
  });

  if (filtered.length === 0) {
    container.innerHTML = '<div class="empty">Keine Bestellungen.</div>';
    return;
  }

  container.innerHTML = filtered.map(orderCard).join('');

  filtered.forEach((o) => {
    const card = document.getElementById(`order-${o.id}`);
    if (!card) return;

    const confirmBtn = card.querySelector('.btn-confirm');
    if (confirmBtn) {
      confirmBtn.onclick = () => {
        const time = card.querySelector('.pickup-input').value;
        confirmOrder(o.id, time);
      };
    }
    const readyBtn = card.querySelector('.btn-ready');
    if (readyBtn) readyBtn.onclick = () => setStatus(o.id, 'fertig');
    const pickedBtn = card.querySelector('.btn-picked');
    if (pickedBtn) pickedBtn.onclick = () => setStatus(o.id, 'abgeholt');
    const cancelBtn = card.querySelector('.btn-cancel');
    if (cancelBtn) cancelBtn.onclick = () => {
      if (confirm('Diese Bestellung wirklich stornieren?')) setStatus(o.id, 'storniert');
    };
  });
}

function orderCard(o) {
  const itemsHtml = o.items
    .map((it) => `<div><span>${it.qty} × ${it.name}</span><span>${money(it.price * it.qty)}</span></div>`)
    .join('');

  let actions = '';
  if (o.status === 'neu') {
    actions = `
      <input type="time" class="pickup-input" value="${o.wishTime || ''}">
      <button class="btn-confirm">Bestätigen</button>
      <button class="btn-cancel">Stornieren</button>
    `;
  } else if (o.status === 'bestaetigt') {
    actions = `
      <span class="pickup-shown">Abholung: ${o.pickupTime} Uhr</span>
      <button class="btn-ready">Fertig gemeldet</button>
      <button class="btn-picked">Abgeholt</button>
      <button class="btn-cancel">Stornieren</button>
    `;
  } else if (o.status === 'fertig') {
    actions = `
      <span class="pickup-shown">Abholung: ${o.pickupTime} Uhr</span>
      <button class="btn-picked">Abgeholt</button>
    `;
  } else if (o.status === 'abgeholt') {
    actions = `<span>✔️ Abgeholt</span>`;
  } else if (o.status === 'storniert') {
    actions = `<span>❌ Storniert</span>`;
  }

  return `
    <div class="order-card ${o.status}" id="order-${o.id}">
      <div class="order-head">
        <span class="nr">#${o.orderNumber}</span>
        <span class="time">${fmtTime(o.createdAt)}</span>
      </div>
      <div class="order-customer">${o.customerName} · <a href="tel:${o.phone}">${o.phone}</a>${o.wishTime ? ` · Wunschzeit ${o.wishTime} Uhr` : ''}</div>
      <div class="order-items">${itemsHtml}
        <div style="font-weight:700;border-top:1px solid #eee;margin-top:4px;padding-top:4px"><span>Gesamt</span><span>${money(o.total)}</span></div>
      </div>
      ${o.note ? `<div class="order-note">📝 ${o.note}</div>` : ''}
      <div class="order-actions">${actions}</div>
    </div>
  `;
}

async function confirmOrder(id, pickupTime) {
  if (!pickupTime) {
    alert('Bitte eine Abholzeit angeben.');
    return;
  }
  await fetch(`/admin/api/orders/${id}/confirm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pickupTime })
  });
  loadOrders();
}

async function setStatus(id, status) {
  await fetch(`/admin/api/orders/${id}/status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status })
  });
  loadOrders();
}

document.getElementById('logoutBtn').onclick = async () => {
  await fetch('/admin/logout', { method: 'POST' });
  window.location.href = 'login.html';
};

document.querySelectorAll('#filters button').forEach((btn) => {
  btn.onclick = () => {
    document.querySelectorAll('#filters button').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    filter = btn.dataset.f;
    loadOrders();
  };
});

(async function init() {
  const ok = await checkSession();
  if (!ok) return;
  loadOrders();
  pollTimer = setInterval(loadOrders, 6000);
})();

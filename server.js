require('dotenv').config();

const express = require('express');
const session = require('express-session');
const path = require('path');
const fs = require('fs');
const store = require('./data/store');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'picknick2024';
const SESSION_SECRET = process.env.SESSION_SECRET || 'change-me-in-.env';

const menu = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'menu.json'), 'utf8'));
const menuByName = new Map();
menu.forEach((cat) => cat.items.forEach((it) => menuByName.set(it.name, it.price)));

app.use(express.json());
app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 8 }
  })
);

// ---------- Public API ----------

app.get('/api/menu', (req, res) => {
  res.json(menu);
});

app.post('/api/orders', (req, res) => {
  const { items, customerName, phone, note, wishTime } = req.body || {};

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Der Warenkorb ist leer.' });
  }
  if (!customerName || !customerName.trim()) {
    return res.status(400).json({ error: 'Bitte gib deinen Namen an.' });
  }
  if (!phone || !phone.trim()) {
    return res.status(400).json({ error: 'Bitte gib eine Telefonnummer an.' });
  }

  // Validate items against the real menu and trust only server-side prices.
  const cleanItems = [];
  for (const raw of items) {
    const price = menuByName.get(raw.name);
    const qty = Math.max(1, Math.min(20, parseInt(raw.qty, 10) || 1));
    if (price === undefined) {
      return res.status(400).json({ error: `Unbekannter Artikel: ${raw.name}` });
    }
    cleanItems.push({ name: raw.name, price, qty, note: (raw.note || '').trim().slice(0, 120) });
  }

  const order = store.createOrder({
    items: cleanItems,
    customerName: customerName.trim().slice(0, 100),
    phone: phone.trim().slice(0, 40),
    note: (note || '').trim().slice(0, 300),
    wishTime: (wishTime || '').trim().slice(0, 20)
  });

  res.json({
    orderNumber: order.orderNumber,
    code: order.code,
    total: order.total
  });
});

app.get('/api/orders/lookup', (req, res) => {
  const { orderNumber, code } = req.query;
  if (!orderNumber || !code) {
    return res.status(400).json({ error: 'Bestellnummer und Code erforderlich.' });
  }
  const order = store.findOrder(orderNumber, code);
  if (!order) {
    return res.status(404).json({ error: 'Bestellung nicht gefunden.' });
  }
  res.json(order);
});

app.post('/api/orders/cancel', (req, res) => {
  const { orderNumber, code } = req.body || {};
  if (!orderNumber || !code) {
    return res.status(400).json({ error: 'Bestellnummer und Code erforderlich.' });
  }
  const order = store.findOrder(orderNumber, code);
  if (!order) {
    return res.status(404).json({ error: 'Bestellung nicht gefunden.' });
  }
  if (order.status !== 'neu' && order.status !== 'bestaetigt') {
    return res.status(400).json({
      error: 'Diese Bestellung kann nicht mehr storniert werden. Bitte ruf uns an: 02264 201941'
    });
  }
  const updated = store.updateOrder(order.id, { status: 'storniert' });
  res.json(updated);
});

// ---------- Admin auth ----------

function requireAuth(req, res, next) {
  if (req.session && req.session.isAdmin) return next();
  res.status(401).json({ error: 'Nicht angemeldet.' });
}

app.post('/admin/login', (req, res) => {
  const { password } = req.body || {};
  if (password && password === ADMIN_PASSWORD) {
    req.session.isAdmin = true;
    return res.json({ ok: true });
  }
  res.status(401).json({ error: 'Falsches Passwort.' });
});

app.post('/admin/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

app.get('/admin/api/session', (req, res) => {
  res.json({ isAdmin: !!(req.session && req.session.isAdmin) });
});

// ---------- Admin API ----------

app.get('/admin/api/orders', requireAuth, (req, res) => {
  res.json(store.getAllOrders());
});

app.post('/admin/api/orders/:id/confirm', requireAuth, (req, res) => {
  const { pickupTime } = req.body || {};
  // Leere Abholzeit ist erlaubt -> Kunde sieht "So schnell wie möglich".
  const order = store.updateOrder(req.params.id, {
    status: 'bestaetigt',
    pickupTime: (pickupTime || '').trim()
  });
  if (!order) return res.status(404).json({ error: 'Bestellung nicht gefunden.' });
  res.json(order);
});

app.post('/admin/api/orders/:id/status', requireAuth, (req, res) => {
  const { status } = req.body || {};
  const allowed = ['neu', 'bestaetigt', 'fertig', 'abgeholt', 'storniert'];
  if (!allowed.includes(status)) {
    return res.status(400).json({ error: 'Ungültiger Status.' });
  }
  const order = store.updateOrder(req.params.id, { status });
  if (!order) return res.status(404).json({ error: 'Bestellung nicht gefunden.' });
  res.json(order);
});

// ---------- Static files ----------

app.use('/admin', express.static(path.join(__dirname, 'public', 'admin')));
app.use(express.static(path.join(__dirname, 'public')));

app.listen(PORT, () => {
  console.log(`Picknick-Grill Bestellsystem läuft auf http://localhost:${PORT}`);
  if (ADMIN_PASSWORD === 'picknick2024') {
    console.log('WARNUNG: Bitte ADMIN_PASSWORD in .env setzen, bevor die Seite online geht!');
  }
});

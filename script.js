/* ---------- helpers ---------- */
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const KES = n => 'KES ' + Math.round(n).toLocaleString('en-KE');
const mem = {};
const store = {
  get(k, d){
    try { const v = localStorage.getItem(k); if (v !== null) return JSON.parse(v); } catch(e){}
    return k in mem ? mem[k] : d;
  },
  set(k, v){ mem[k] = v; try { localStorage.setItem(k, JSON.stringify(v)); } catch(e){} }
};

/* ---------- data ---------- */
const CATS = ['Tools','Plumbing','Electrical','Paint','Building','Fasteners'];
const ICON = {Tools:'🔨',Plumbing:'🚰',Electrical:'💡',Paint:'🎨',Building:'🧱',Fasteners:'🔩'};
const SEED = [
  {id:1,name:'Claw hammer 16oz',cat:'Tools',price:560,stock:40,img:'images/hammer.jpg'},
  {id:2,name:'Cordless drill 18V',cat:'Tools',price:4500,stock:24,img:'images/drill.jpg'},
  {id:3,name:'Spirit level 60cm',cat:'Tools',price:1200,stock:25,img:'images/spirit-level.jpg'},
  {id:4,name:'PVC pipe 1/2 inch (3m)',cat:'Plumbing',price:650,stock:60,img:'images/pvc-pipe.jpg'},
  {id:5,name:'Brass tap, kitchen',cat:'Plumbing',price:750,stock:28,img:'images/tap.jpg'},
  {id:6,name:'Socket outlet',cat:'Electrical',price:450,stock:70,img:'images/socket.jpg'},
  {id:7,name:'LED bulb 12W',cat:'Electrical',price:250,stock:36,img:'images/led-bulb.jpg'},
  {id:8,name:'Copper cable 2.5mm (100m)',cat:'Electrical',price:3550,stock:45,img:'images/cable.jpg'},
  {id:9,name:'Emulsion paint 4L, white',cat:'Paint',price:2200,stock:30,img:'images/paint.jpg'},
  {id:10,name:'Paint roller set',cat:'Paint',price:740,stock:22,img:'images/roller.jpg'},
  {id:11,name:'Cement 50kg bag',cat:'Building',price:780,stock:200,img:'images/cement.jpg'},
  {id:12,name:'Building sand (per tonne)',cat:'Building',price:2700,stock:50,img:'images/sand.jpg'},
  {id:13,name:'Roofing nails',cat:'Fasteners',price:320,stock:80,img:'images/nails.jpg'},
  {id:14,name:'Wood screws box',cat:'Fasteners',price:400,stock:55,img:'images/screws.jpg'},
  {id:15,name:'Padlock 50mm',cat:'Fasteners',price:900,stock:23,img:'images/padlock.jpg'}
];
let products = store.get('jh_products_v2', SEED);
let orders = store.get('jh_orders', []);
let cart = {};
let cat = 'All', query = '', sort = 'name', admin = false;
const STATUS = ['Received','Packed','Out for delivery','Completed'];
const BULK_QTY = 10, BULK_OFF = 0.05, FREE_DELIVERY = 10000, DELIVERY_FEE = 500;

const byId = id => products.find(p => p.id === id);
const save = () => { store.set('jh_products_v2', products); store.set('jh_orders', orders); };

/* ---------- navigation ---------- */
function show(view){
  ['shop','track','admin'].forEach(v => { $('#view-'+v).hidden = v !== view; });
  document.querySelectorAll('nav [data-view]').forEach(b => b.setAttribute('aria-current', b.dataset.view === view));
  window.scrollTo(0,0);
  if (view === 'admin') renderAdmin();
}
document.addEventListener('click', e => {
  const v = e.target.closest('[data-view]');
  if (v){ e.preventDefault(); show(v.dataset.view); }
});

/* ---------- shop ---------- */
function renderChips(){
  $('#chips').innerHTML = ['All', ...CATS].map(c =>
    `<button class="chip" data-cat="${c}" aria-pressed="${c===cat}">${c}</button>`).join('');
}
function renderGrid(){
  let list = products.filter(p => (cat === 'All' || p.cat === cat) && p.name.toLowerCase().includes(query.toLowerCase()));
  if (sort === 'low') list.sort((a,b) => a.price - b.price);
  else if (sort === 'high') list.sort((a,b) => b.price - a.price);
  else list.sort((a,b) => a.name.localeCompare(b.name));
  $('#grid').innerHTML = list.length ? list.map(p => `
    <article class="card">
      <div class="tile" aria-hidden="true">${ICON[p.cat] || '🛠️'}${p.img ? `<img src="${esc(p.img)}" alt="" loading="lazy" onerror="this.remove()">` : ''}</div>
      <div class="body">
        <h3>${esc(p.name)}</h3>
        <div class="meta">${esc(p.cat)}. ${Math.round(BULK_OFF*100)}% off at ${BULK_QTY}+</div>
        <div class="price">${KES(p.price)}</div>
        ${p.stock === 0 ? '<div class="low">Out of stock</div>' : p.stock <= 5 ? `<div class="low">Only ${p.stock} left</div>` : ''}
        <div class="row"><button class="btn" data-add="${p.id}" ${p.stock===0?'disabled':''}>Add to cart</button></div>
      </div>
    </article>`).join('') : '<div class="empty">No products match. Try another word or category.</div>';
}
$('#chips').addEventListener('click', e => {
  const c = e.target.closest('[data-cat]'); if (!c) return;
  cat = c.dataset.cat; renderChips(); renderGrid();
});
$('#sort').addEventListener('change', e => { sort = e.target.value; renderGrid(); });
$('#searchForm').addEventListener('submit', e => { e.preventDefault(); query = $('#q').value.trim(); renderGrid(); $('#grid').scrollIntoView(); });
$('#q').addEventListener('input', e => { query = e.target.value.trim(); renderGrid(); });
$('#grid').addEventListener('click', e => {
  const b = e.target.closest('[data-add]'); if (b) addToCart(+b.dataset.add);
});

/* ---------- cart ---------- */
function toast(msg){
  const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg;
  document.body.appendChild(t); setTimeout(() => t.remove(), 1800);
}
function addToCart(id, n = 1){
  const p = byId(id); if (!p) return;
  const next = (cart[id] || 0) + n;
  if (next > p.stock){ toast('Only ' + p.stock + ' in stock'); return; }
  if (next <= 0) delete cart[id]; else cart[id] = next;
  renderCart();
  if (n > 0) toast('Added to cart');
}
function lineTotal(p, q){ return p.price * q * (q >= BULK_QTY ? 1 - BULK_OFF : 1); }
function totals(method = 'delivery'){
  let subtotal = 0;
  Object.entries(cart).forEach(([id,q]) => { subtotal += lineTotal(byId(+id), q); });
  const delivery = !subtotal || method === 'pickup' || subtotal >= FREE_DELIVERY ? 0 : DELIVERY_FEE;
  return {subtotal, delivery, total: subtotal + delivery};
}
function renderCart(){
  const ids = Object.keys(cart).map(Number);
  $('#cartCount').textContent = ids.reduce((s,id) => s + cart[id], 0);
  $('#lines').innerHTML = ids.length ? ids.map(id => {
    const p = byId(id), q = cart[id];
    return `<div class="line">
      <div><b>${esc(p.name)}</b><div class="note">${KES(p.price)} each${q>=BULK_QTY?' (bulk price)':''}</div></div>
      <div style="text-align:right">${KES(lineTotal(p,q))}</div>
      <div class="qty"><button data-dec="${id}" aria-label="Decrease">-</button><span>${q}</span><button data-inc="${id}" aria-label="Increase">+</button></div>
      <div style="text-align:right"><button class="btn alt sm" data-del="${id}">Remove</button></div>
    </div>`;
  }).join('') : '<p class="empty" style="padding:32px 0">Your cart is empty. Add something from the shop.</p>';
  const t = totals();
  $('#sum').innerHTML = `
    <div><span>Subtotal</span><span>${KES(t.subtotal)}</span></div>
    <div><span>Delivery</span><span>${t.delivery ? KES(t.delivery) : 'Free'}</span></div>
    <div class="t"><span>Total</span><span>${KES(t.total)}</span></div>
    <p class="note">Free delivery over ${KES(FREE_DELIVERY)}. ${Math.round(BULK_OFF*100)}% off any item bought ${BULK_QTY}+.</p>
    <button class="btn" id="goCheckout" style="width:100%" ${ids.length?'':'disabled'}>Checkout</button>`;
}
$('#lines').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.inc) addToCart(+b.dataset.inc, 1);
  if (b.dataset.dec) addToCart(+b.dataset.dec, -1);
  if (b.dataset.del){ delete cart[b.dataset.del]; renderCart(); }
});
function openCart(o){ $('#cart').hidden = !o; $('#scrim').hidden = !o; if (o) renderCart(); }
$('#openCart').onclick = () => openCart(true);
$('#closeCart').onclick = () => openCart(false);
$('#scrim').onclick = () => openCart(false);
document.addEventListener('keydown', e => { if (e.key === 'Escape') openCart(false); });

/* ---------- checkout ---------- */
const co = $('#checkout');
$('#sum').addEventListener('click', e => {
  if (e.target.id === 'goCheckout'){ openCart(false); syncCheckout(); co.showModal(); }
});
function syncCheckout(){
  const pickup = $('#cMethod').value === 'pickup';
  $('#addrWrap').hidden = pickup;
  const t = totals($('#cMethod').value);
  const pay = $('#cPay').value;
  $('#payNote').textContent = (pay === 'M-Pesa' ? 'You will get an M-Pesa prompt on your phone (simulated). ' : pay === 'Card' ? 'Card payment is simulated in this demo. ' : 'Pay when you receive your order. ')
    + 'Total to pay: ' + KES(t.total) + '.';
  $('#coErr').textContent = '';
}
['#cMethod','#cPay'].forEach(s => $(s).addEventListener('change', syncCheckout));
$('#coCancel').onclick = () => { co.close(); openCart(true); };
$('#coForm').addEventListener('submit', e => {
  e.preventDefault();
  const name = $('#cName').value.trim(), phone = $('#cPhone').value.trim().replace(/\s/g,'');
  const method = $('#cMethod').value, addr = $('#cAddr').value.trim();
  if (!/^(07|01)\d{8}$|^\+254\d{9}$/.test(phone)){ $('#coErr').textContent = 'Enter a valid Kenyan phone number, like 0712345678.'; return; }
  if (method === 'delivery' && !addr){ $('#coErr').textContent = 'Enter a delivery address.'; return; }
  const t = totals(method);
  const items = Object.entries(cart).map(([id,q]) => { const p = byId(+id); return {id:p.id,name:p.name,qty:q,line:lineTotal(p,q)}; });
  if (!items.length) return;
  const seq = store.get('jh_seq', 1000) + 1; store.set('jh_seq', seq);
  const order = {id:'JH-'+seq,name,phone,method,addr,pay:$('#cPay').value,items,...t,status:STATUS[0],date:new Date().toLocaleString('en-KE')};
  items.forEach(i => { byId(i.id).stock -= i.qty; });
  orders.unshift(order); save(); cart = {}; renderCart(); renderGrid();
  co.close(); e.target.reset();
  $('#doneId').textContent = order.id;
  $('#doneNote').textContent = method === 'pickup' ? 'We will message you when it is ready for pickup.' : 'We will call you before delivery.';
  $('#done').showModal();
});
$('#doneClose').onclick = () => { $('#done').close(); show('shop'); };

/* ---------- tracking ---------- */
$('#trackForm').addEventListener('submit', e => {
  e.preventDefault();
  const id = $('#trackId').value.trim().toUpperCase();
  const o = orders.find(x => x.id === id);
  $('#trackResult').innerHTML = !o ? '<p class="err">No order found with that number. Check it and try again.</p>' : `
    <p><b>${esc(o.id)}</b> for ${esc(o.name)}. Total ${KES(o.total)}, ${esc(o.pay)}.</p>
    <div class="steps">${STATUS.map((s,i) => `<span class="step ${i <= STATUS.indexOf(o.status)?'on':''}">${s}</span>`).join('')}</div>
    <p class="note">${o.items.map(i => esc(i.name)+' x'+i.qty).join(', ')}</p>`;
});

/* ---------- admin ---------- */
$('#adminForm').addEventListener('submit', e => {
  e.preventDefault();
  if ($('#adminPass').value === 'admin123'){ admin = true; $('#adminPass').value = ''; renderAdmin(); }
  else $('#adminErr').textContent = 'Wrong password.';
});
function renderAdmin(){
  $('#adminLock').hidden = admin; $('#adminBody').hidden = !admin;
  if (!admin) return;
  $('#pCat').innerHTML = CATS.map(c => `<option>${c}</option>`).join('');
  const revenue = orders.reduce((s,o) => s + o.total, 0);
  const low = products.filter(p => p.stock <= 5).length;
  $('#stats').innerHTML = `
    <div class="stat">Orders<b>${orders.length}</b></div>
    <div class="stat">Revenue<b>${KES(revenue)}</b></div>
    <div class="stat">Average order<b>${KES(orders.length ? revenue/orders.length : 0)}</b></div>
    <div class="stat">Low stock items<b>${low}</b></div>`;
  $('#invTable').innerHTML = '<tr><th>Product</th><th>Price (KES)</th><th>Stock</th><th></th></tr>' + products.map(p => `
    <tr><td>${esc(p.name)}</td>
    <td><input type="number" min="1" value="${p.price}" data-price="${p.id}" aria-label="Price for ${esc(p.name)}"></td>
    <td><input type="number" min="0" value="${p.stock}" data-stock="${p.id}" aria-label="Stock for ${esc(p.name)}"></td>
    <td><button class="btn alt sm" data-rm="${p.id}">Delete</button></td></tr>`).join('');
  $('#ordTable').innerHTML = orders.length ? '<tr><th>Order</th><th>Customer</th><th>Total</th><th>Status</th></tr>' + orders.map(o => `
    <tr><td>${esc(o.id)}<div class="note">${esc(o.date)}</div></td>
    <td>${esc(o.name)}<div class="note">${esc(o.phone)}, ${o.method}</div></td>
    <td>${KES(o.total)}</td>
    <td><select data-status="${o.id}" aria-label="Status for ${esc(o.id)}">${STATUS.map(s => `<option ${s===o.status?'selected':''}>${s}</option>`).join('')}</select></td></tr>`).join('')
    : '<tr><td>No orders yet. Place one from the shop to see it here.</td></tr>';
}
$('#addForm').addEventListener('submit', e => {
  e.preventDefault();
  const id = products.reduce((m,p) => Math.max(m,p.id), 0) + 1;
  products.push({id, name:$('#pName').value.trim(), cat:$('#pCat').value, price:+$('#pPrice').value, stock:+$('#pStock').value, img:$('#pImg').value.trim()});
  save(); e.target.reset(); renderAdmin(); renderGrid(); toast('Product added');
});
$('#invTable').addEventListener('change', e => {
  const t = e.target, p = byId(+(t.dataset.price || t.dataset.stock)); if (!p) return;
  const v = Math.max(0, +t.value || 0);
  if (t.dataset.price) p.price = Math.max(1, v); else p.stock = v;
  save(); renderGrid(); renderAdmin();
});
$('#invTable').addEventListener('click', e => {
  const b = e.target.closest('[data-rm]'); if (!b) return;
  const id = +b.dataset.rm; products = products.filter(p => p.id !== id); delete cart[id];
  save(); renderAdmin(); renderGrid(); renderCart();
});
$('#ordTable').addEventListener('change', e => {
  const s = e.target.dataset.status; if (!s) return;
  orders.find(o => o.id === s).status = e.target.value; save(); toast('Status updated');
});

/* ---------- start ---------- */
renderChips(); renderGrid(); renderCart();

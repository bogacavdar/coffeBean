// araclar/telefon-denetimi.js (v0.39 §13) – CoffeBean telefon denetimi: 1. günü oynar, her ekranda görünmeyen düğme, taşma, kesik yazı ve çakışma arar; ekran görüntüsü alır.
// Kullanım (Node + Playwright): önce oyunu yerelde sunun (python3 -m http.server 8765), sonra:  node araclar/telefon-denetimi.js [url] [çıktı klasörü] [boyutlar]   boyutlar: "320x568,360x640" ; "L" ekiyle yatay (ör. 844x390L)
const { chromium } = require('playwright');
const fs = require('fs');
const URL = process.argv[2] || 'http://localhost:8765/index.html';
const OUT = process.argv[3] || require('path').join(__dirname, 'denetim-sonuc');
const SIZES = (process.argv[4] || '320x568,360x640,375x667,390x844,412x915').split(',');
const SHOTS = process.env.SHOTS !== '0';
fs.mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ---- sayfa içi denetim ----
function auditInPage(name) {
  const W = innerWidth, H = innerHeight, V = [];
  const cs = el => getComputedStyle(el);
  const shown = el => { if (!el) return false; const r = el.getBoundingClientRect(); if (r.width < 1 || r.height < 1) return false;
    for (let e = el; e && e !== document; e = e.parentElement) { const s = cs(e); if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity < 0.05) return false; } return true; };
  const isOn = sel => { const e = document.querySelector(sel); return e && e.classList.contains('on'); };
  const txt = el => (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim();
  // aktif katman
  const ovs = [...document.querySelectorAll('.overlay.on')].filter(shown);
  let layer, panel, mode;
  if (ovs.length) { ovs.sort((a, b) => (+cs(a).zIndex || 0) - (+cs(b).zIndex || 0)); layer = ovs[ovs.length - 1]; panel = layer.querySelector('.card'); mode = 'overlay'; }
  else if (isOn('#sheet')) { layer = document.querySelector('#sheet'); panel = layer.querySelector('.wrap'); mode = 'sheet'; }
  else if (shown(document.querySelector('#menu'))) { layer = document.querySelector('#menu'); panel = null; mode = 'menu'; }
  else { layer = document.body; panel = null; mode = 'scene'; }
  const inLayer = el => mode === 'scene' ? !el.closest('.overlay,#sheet,#menu,#quitScreen,#cheats') : layer.contains(el);
  const extra = mode === 'sheet' ? [...document.querySelectorAll('#orders button')] : [];
  const scrollAnc = el => { for (let e = el.parentElement; e && e !== document.body; e = e.parentElement) { const s = cs(e); if (/(auto|scroll)/.test(s.overflowY) && e.scrollHeight > e.clientHeight + 1) return e; } return null; };
  const within = (r, b, tol = 1) => r.left >= b.left - tol && r.right <= b.right + tol && r.top >= b.top - tol && r.bottom <= b.bottom + tol;
  const VR = { left: 0, top: 0, right: W, bottom: H };
  const label = el => (el.id ? '#' + el.id : el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.split(' ')[0] : '')) + ' "' + txt(el).slice(0, 30) + '"';
  // 1) düğmeler
  const btns = [...document.querySelectorAll('button,[role=button],.icon')].filter(b => inLayer(b) && shown(b)).concat(extra.filter(shown));
  const PRI = [/^ÖĞÜT/, /^BASILI TUT/, /^BAŞLAT/, /^DURDUR/, /^BASTIR/, /^Anladım/, /^Hazırlamaya başla/, /^Teslim et/, /^Yeniden yap/, /^Devam/, /^Günü başlat/, /^☕ Günü başlat/, /^Kirayı öde/, /^\+₺5/];
  const primaries = [];
  btns.forEach(b => { const r = b.getBoundingClientRect(), t = txt(b);
    const sa = scrollAnc(b);
    const isPri = PRI.some(p => p.test(t));
    if (isPri) primaries.push(t.slice(0, 24));
    if (within(r, VR)) {
      if (sa && !within(r, sa.getBoundingClientRect())) { if (isPri) V.push('1P birincil düğme kaydırmadan görünmüyor: ' + label(b)); }
      else if (isPri) { const cx = r.left + r.width / 2, cy = r.top + r.height / 2, hit = document.elementFromPoint(cx, cy); if (hit && !b.contains(hit) && !hit.contains(b)) V.push('1P birincil düğmenin üstü örtülü: ' + label(b) + ' ← ' + label(hit)); }
    } else {
      if (isPri) V.push('1P birincil düğme ekran dışında: ' + label(b) + ` [${Math.round(r.left)},${Math.round(r.top)},${Math.round(r.right)},${Math.round(r.bottom)}]`);
      else if (!sa) V.push('1 düğme ekran dışında (kaydırılamaz): ' + label(b) + ` [${Math.round(r.left)},${Math.round(r.top)},${Math.round(r.right)},${Math.round(r.bottom)}]`);
      else { const ar = sa.getBoundingClientRect(); if (r.left < ar.left - 1 || r.right > ar.right + 1) V.push('1 düğme kabın yanından taşıyor: ' + label(b)); }
    }
    // 3) düğme metni taşıyor mu
    if (b.scrollWidth > b.clientWidth + 1 || b.scrollHeight > b.clientHeight + 2) V.push('3 düğme metni taşıyor: ' + label(b) + ` sw${b.scrollWidth}/cw${b.clientWidth} sh${b.scrollHeight}/ch${b.clientHeight}`);
  });
  // 2) yatay taşma
  const se = document.scrollingElement; if (se.scrollWidth > se.clientWidth + 1) V.push('2 sayfa yatay taşıyor ' + se.scrollWidth + '>' + se.clientWidth);
  if (panel) { if (panel.scrollWidth > panel.clientWidth + 1) V.push('2 panel yatay taşıyor ' + panel.scrollWidth + '>' + panel.clientWidth + ' ' + label(panel));
    const pr = panel.getBoundingClientRect();
    [...panel.querySelectorAll('*')].filter(shown).forEach(e => { const r = e.getBoundingClientRect(); if (r.right > pr.right + 1.5 || r.left < pr.left - 1.5) V.push('2 öğe panelin yanından taşıyor: ' + label(e) + ` [${Math.round(r.left)}..${Math.round(r.right)} / ${Math.round(pr.left)}..${Math.round(pr.right)}]`); });
    if (!within(pr, VR)) V.push('2 panel ekrandan taşıyor ' + JSON.stringify([pr.left, pr.top, pr.right, pr.bottom].map(Math.round)));
  }
  // 3) metin kesilmesi
  const textEls = [...document.querySelectorAll('body *')].filter(e => (inLayer(e) || e.closest('#hud')) && e.childNodes.length && [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) && shown(e));
  textEls.forEach(e => { const s = cs(e);
    if (s.textOverflow === 'ellipsis' && e.scrollWidth > e.clientWidth + 1) V.push('3 metin "…" ile kesiliyor: ' + label(e));
    else if ((s.overflowX === 'hidden' || s.overflow === 'hidden') && e.scrollWidth > e.clientWidth + 1 && e.tagName !== 'BUTTON') V.push('3 metin kırpılıyor: ' + label(e) + ` ${e.scrollWidth}>${e.clientWidth}`);
    const r = e.getBoundingClientRect(); if (r.right > W + 1 || r.left < -1) V.push('3 metin ekran dışına taşıyor: ' + label(e));
  });
  { const t = document.querySelector('#tut'); if (t && shown(t) && t.scrollHeight > t.clientHeight + 1) V.push('3 öğretici metni kutuya sığmıyor: ' + txt(t).slice(0, 40)); }
  { const t = document.querySelector('#toast.on'); if (t && shown(t) && t.scrollHeight > t.clientHeight + 1) V.push('3 toast metni sığmıyor: ' + txt(t).slice(0, 40)); }
  // 3b) satır kırılması: dar kapta tek kelimelik satırlar / ≤4 kelimelik metin 3+ satır (yalnız telefon boyları)
  if (W <= 620 || H <= 520) textEls.forEach(e => {
    if (e.closest('#cheats')) return;
    const tw = document.createTreeWalker(e, NodeFilter.SHOW_TEXT), words = [];
    for (let n = tw.nextNode(); n; n = tw.nextNode()) { if (!shown(n.parentElement)) continue; const t = n.textContent; const re = /\S+/g; let m;
      while ((m = re.exec(t))) { const r = document.createRange(); r.setStart(n, m.index); r.setEnd(n, m.index + m[0].length); const rc = r.getClientRects()[0]; if (rc && rc.width > 0) words.push({ w: m[0], top: rc.top, h: rc.height }); } }
    if (words.length < 2) return;
    const lines = []; words.forEach(x => { const l = lines.find(l => Math.abs(l.top - x.top) < Math.max(4, x.h * .5)); if (l) l.n++; else lines.push({ top: x.top, n: 1, w: x.w }); });
    const cw = e.getBoundingClientRect().width;
    if (lines.length > 1 && cw < 90 && lines.some(l => l.n === 1)) V.push('3b dar kapta (' + Math.round(cw) + 'px) tek kelimelik satır: ' + label(e));
    if (words.length <= 4 && lines.length >= 3) V.push('3b ≤4 kelime ' + lines.length + ' satıra kırılıyor: ' + label(e));
  });
  // 5d) balon tasarımı: genişlik ≤ %62, yazı ≥ 12 px, ≤ 45 karakterlik cümle en fazla 2 satır
  if (window.SCENE && SCENE.bubbles && mode === 'scene') SCENE.bubbles().forEach(b => { if (b.w > W * .62 + 1) V.push('5d balon %62\'den geniş: ' + b.text); if (b.fsz < 12) V.push('5d balon yazısı küçük: ' + b.text);
    if (b.lines > 2 && b.text.length <= 45) V.push('5d balon 2 satırı aşıyor: ' + b.text); });
  // 5b) sahne: balon/rozet/etiket kutuları birbirine binmesin, [8, W − ikon sütunu − 8] içinde kalsın
  if (window.SCENE && SCENE.overlays && mode === 'scene') { const ov = SCENE.overlays(), R = (W < H ? (SCENE.insets().right || 0) : 0);
    ov.forEach((a, i) => { if (a.x < 7.5 || a.x + a.w > W - 7.5 || (R && a.x + a.w > W - R - 1.5 && a.y + a.h > (SCENE.insets().iconTop || 0) - 1.5) || (() => { const t = document.querySelector('#toast.on'); if (!t || +getComputedStyle(t).opacity < .5) return false; const q = t.getBoundingClientRect(); return a.x < q.right && a.x + a.w > q.left && a.y < q.bottom && a.y + a.h > q.top; })()) V.push('5b ' + a.kind + ' sahne alanı dışında: ' + (a.text || '')); 
      ov.slice(i + 1).forEach(b => { if (a.x < b.x + b.w - .5 && a.x + a.w > b.x + .5 && a.y < b.y + b.h - .5 && a.y + a.h > b.y + .5) V.push('5b çakışma: ' + a.kind + ' "' + (a.text || '') + '" × ' + b.kind + ' "' + (b.text || '') + '"'); }); }); }
  // 4) üstteki katmanlar panel/kart içeriğiyle kesişmesin
  const inter = (a, b) => a.left < b.right - 1 && a.right > b.left + 1 && a.top < b.bottom - 1 && a.bottom > b.top + 1;
  if (panel) { const pr = panel.getBoundingClientRect(), pz = +cs(layer).zIndex || 0;
    const tops = [['#exitBtn', document.querySelector('#exitBtn')], ['toast', document.querySelector('#toast.on')], ['#orders', document.querySelector('#orders')], ['#hud', document.querySelector('#hud')]];
    tops.forEach(([n, el]) => { if (!el || !shown(el)) return; const z = +cs(el).zIndex || 0; if (z <= pz) return; const r = el.getBoundingClientRect(); if (inter(r, pr)) V.push('4 ' + n + ' paneli örtüyor (z' + z + '>' + pz + ')'); });
  } else if (mode === 'scene') { // sahnede toast HUD'u örtmesin
    const t = document.querySelector('#toast.on'), h = document.querySelector('#hud');
    if (t && shown(t) && shown(h) && inter(t.getBoundingClientRect(), h.getBoundingClientRect())) V.push('4 toast HUD\'u örtüyor');
    const ex = document.querySelector('#exitBtn'); if (shown(ex) && shown(h) && inter(ex.getBoundingClientRect(), h.getBoundingClientRect())) V.push('4 Çıkış HUD ile çakışıyor');
  }
  // 5) konuşma balonları
  if (window.SCENE && SCENE.bubbles && mode === 'scene') { const h = document.querySelector('#hud'), hr = shown(h) ? h.getBoundingClientRect() : null;
    SCENE.bubbles().forEach(b => { if (b.x < 7.5 || b.x + b.w > W - 7.5 || b.y < 0 || b.y + b.h > H) V.push('5 balon ekran dışında: ' + b.text);
      if (hr && inter({ left: b.x, top: b.y, right: b.x + b.w, bottom: b.y + b.h }, hr)) V.push('5 balon HUD ile çakışıyor: ' + b.text); }); }
  // bilgi
  const hud = document.querySelector('#hud'); const cu = document.querySelector('#closeup');
  if (window.__ovV) { __ovV.forEach(v => V.push(v)); __ovV.clear(); }
  return { name, mode, V: [...new Set(V)], primaries, hudH: shown(hud) ? Math.round(hud.getBoundingClientRect().bottom) : 0, canvasH: cu && shown(cu) ? Math.round(cu.getBoundingClientRect().height) : 0 };
}

async function run(size) {
  const land = /L$/.test(size), [w, h] = size.replace('L', '').split('x').map(Number);
  const browser = await chromium.launch();
  const mobile = land ? w < 1000 : true;
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  const errs = []; page.on('pageerror', e => errs.push(String(e))); page.on('console', m => { if (m.type() === 'error' && !/ERR_TUNNEL|fonts.g/.test(m.text())) errs.push(m.text()); });
  await page.goto(URL); await sleep(900);
  // her karede sahne kutularını denetle (balon/rozet/etiket): çakışma ve sahne alanı dışı
  await page.evaluate(() => { window.__ovV = new Set(); const f = () => { try { if (window.SCENE && SCENE.overlays && !document.querySelector('.overlay.on') && !document.querySelector('#sheet.on')) {
      const W = innerWidth, H = innerHeight, ov = SCENE.overlays(), R = W < H ? (SCENE.insets().right || 0) : 0;
      ov.forEach((a, i) => { if (a.x < 7.5 || a.x + a.w > W - 7.5 || (R && a.x + a.w > W - R - 1.5 && a.y + a.h > (SCENE.insets().iconTop || 0) - 1.5) || (() => { const t = document.querySelector('#toast.on'); if (!t || +getComputedStyle(t).opacity < .5) return false; const q = t.getBoundingClientRect(); return a.x < q.right && a.x + a.w > q.left && a.y < q.bottom && a.y + a.h > q.top; })()) __ovV.add('5c (kare) ' + a.kind + ' sahne alanı dışında: ' + a.text);
        ov.slice(i + 1).forEach(b => { if (a.x < b.x + b.w - .5 && a.x + a.w > b.x + .5 && a.y < b.y + b.h - .5 && a.y + a.h > b.y + .5) __ovV.add('5c (kare) çakışma: ' + a.kind + ' "' + a.text + '" × ' + b.kind + ' "' + b.text + '"'); }); }); } } catch (e) {} requestAnimationFrame(f); }; requestAnimationFrame(f); });
  const results = []; let n = 0;
  const tag = size;
  const check = async (name) => { await sleep(120); const r = await page.evaluate(auditInPage, name); r.size = tag; results.push(r);
    if (SHOTS) await page.screenshot({ path: `${OUT}/${tag}_${String(++n).padStart(2, '0')}_${name}.png` });
    console.log(`[${tag}] ${name} (${r.mode}) ihlal=${r.V.length} js=${errs.length}${r.canvasH ? ' tuval=' + r.canvasH : ''}${r.V.length ? '\n   - ' + r.V.join('\n   - ') : ''}`); return r; };
  const click = async (sel, opt = {}) => { const l = page.locator(sel).first(); await l.click({ timeout: 4000, ...opt }); await sleep(250); };
  const clickText = async (t) => { await page.getByRole('button', { name: t }).first().click({ timeout: 4000 }); await sleep(250); };
  const waitFor = async (fn, arg, ms = 15000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await page.evaluate(fn, arg)) return true; await sleep(60); } return false; };
  const tapCustomer = async () => {
    const pt = await page.evaluate(() => { const d = CEKIRDEK.day(); if (!d) return null; const q = d.customers.filter(c => !c.ordered && !c.leaving); const c = q[0]; if (!c) return null;
      for (let y = 60; y < innerHeight - 20; y += 6) for (let x = 10; x < innerWidth - 10; x += 6) if (SCENE.hitTest(x, y) === c.id) return { x: x + 6, y: y + 20 }; return null; });
    if (!pt) return false; await page.mouse.click(pt.x, pt.y); await sleep(300); return true; };
  const zB = '#zB';
  try {
    await check('menu');
    await click('#btnNew'); await check('slots');
    await click('[data-act="new"][data-i="1"]'); await check('zorluk');
    await click('[data-diff="normal"]'); await check('giris_teyze');
    await clickText('Devral'); await sleep(900);
    const mbtn = async l => { await page.evaluate(l => { const b = [...document.querySelectorAll('#ovModal.on button')].find(x => x.textContent.trim() === l); if (b) b.click(); }, l); await sleep(350); };
    await sleep(400); await check('sahne_teyze');   // v0.46: açılış dersi kaldırıldı
    if (!await tapCustomer()) throw new Error('Yıldız Teyze tıklanamadı');
    await sleep(400); await check('tut_ogut_anladim');
    // öğütme
    await click('#tutOk'); await check('tut_ogut_calisiyor');
    await waitFor(() => { const b = document.querySelector('#zB'); return b && !b.disabled && /Tam şimdi/.test((document.querySelector('#zRes') || {}).textContent || ''); });
    await check('tut_ogut_tamsimdi');
    await page.locator(zB).dispatchEvent('pointerdown'); await sleep(800);
    // dozlama
    await waitFor(() => !!document.querySelector('#tutOk')); await check('tut_doz_anladim'); await click('#tutOk');
    { await click(zB); await check('tut_doz_erken');   // v0.42 öğreticide dozlama kaydırarak
      const cb = await page.locator('#closeup').boundingBox(); await page.mouse.move(cb.x + cb.width * .3, cb.y + cb.height / 2); await page.mouse.down();
      for (let j = 0; j < 40 && !(await page.evaluate(() => /Tam 18 gram/.test(document.querySelector('#tut').textContent))); j++) await page.mouse.move(cb.x + cb.width * (j % 2 ? .3 : .7), cb.y + cb.height / 2, { steps: 4 });
      await page.mouse.up(); await check('tut_doz_tamam'); await click(zB); }
    await sleep(800);
    // temperleme
    await waitFor(() => !!document.querySelector('#tutOk')); await check('tut_temper_anladim'); await click('#tutOk');
    { const b = await page.locator(zB).boundingBox(); await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await page.mouse.down();   // v0.40: temper basılı tut
      await waitFor(() => /Şimdi bırak/.test((document.querySelector('#tut') || {}).textContent || '')); await check('tut_temper_tamsimdi'); await page.mouse.up(); await sleep(800); }
    // çekme
    await waitFor(() => !!document.querySelector('#tutOk')); await check('tut_cek_anladim'); await click('#tutOk');
    await click(zB); await sleep(300); await check('tut_cek_akiyor');
    await waitFor(() => /Şimdi durdur/.test(document.querySelector('#tut').textContent), null, 20000); await check('tut_cek_durdur'); await click(zB);
    await waitFor(() => !!document.querySelector('#rvServe')); await check('tut_inceleme');
    await click('#rvServe'); await sleep(300); await check('tut_servis_toast');
    await waitFor(() => document.querySelector('#ovModal').classList.contains('on')); await check('teyze_veda');
    await clickText('Devam');
    // normal müşteri
    await page.evaluate(() => { const d = CEKIRDEK.day(); d.nextSpawn = d.t + 0.2; });
    await waitFor(() => { const d = CEKIRDEK.day(); const q = d && d.customers.filter(c => !c.ordered && !c.leaving); return q && q[0] && q[0].say && !q[0].moving; }, null, 25000);
    await page.evaluate(() => { const d = CEKIRDEK.day(); d.nextSpawn = d.t + 0.5; });   // ikinci müşteri sıraya (şerit için)
    await sleep(1500); await check('sahne_musteri_balon');
    await tapCustomer(); await sleep(400); await check('ders_secim'); await mbtn('Anladım'); await check('secim');
    if (await page.evaluate(() => { const x = document.querySelector('#sheetX'); return x && getComputedStyle(x).display !== 'none'; })) {
      await click('#sheetX'); await check('panel_kapali_siparis_bekliyor');
      const pt = await page.evaluate(() => { const d = CEKIRDEK.day(), id = d.orders[0].cust.id; for (let y = 60; y < innerHeight - 20; y += 6) for (let x = 10; x < innerWidth - 10; x += 6) if (SCENE.hitTest(x, y) === id) return { x: x + 6, y: y + 20 }; return null; });
      if (pt) { await page.mouse.click(pt.x, pt.y); await sleep(300); } else throw new Error('bekleyen sipariş müşterisi bulunamadı');
      await check('panel_geri_acildi');
    }
    const want = await page.evaluate(() => { const o = CEKIRDEK.day().orders[0]; return { d: o.cust.drink, z: o.cust.size }; });
    const wrongZ = want.z === 'double' ? 'single' : 'double';
    await click(`[data-sd="${want.d}"]`); await click(`[data-sz="${wrongZ}"]`); await check('secim_yanlis_boy');
    await click('#selGo'); await sleep(300); await check('hazirla_ogut');
    const playSteps = async (tagp) => {
      for (let k = 0; k < 8; k++) {
        if (await page.evaluate(() => !!document.querySelector('#rvServe'))) return;
        if (await page.evaluate(() => !!document.querySelector('#lesOk'))) { await check(tagp + '_ders'); await click('#lesOk'); }
        const t = await page.evaluate(() => (document.querySelector('#zB') || {}).textContent || '');
        if (/ÖĞÜT|BASTIR/.test(t)) { await page.locator(zB).dispatchEvent('pointerdown'); }
        else if (/BASILI/.test(t)) { const b = await page.locator(zB).boundingBox(); await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await page.mouse.down(); await sleep(1400); await check(tagp + '_doz_basili'); await page.mouse.up(); }
        else if (/^TAMAM/.test(t)) { const cb = await page.locator('#closeup').boundingBox(); await page.mouse.move(cb.x + cb.width * .3, cb.y + cb.height / 2); await page.mouse.down();   // v0.40 dozlama: sallayarak doldur
          for (let j = 0; j < 16; j++) { await page.mouse.move(cb.x + cb.width * (j % 2 ? .3 : .7), cb.y + cb.height / 2, { steps: 4 }); } await page.mouse.up(); await click(zB); }
        else if (/BAŞLAT/.test(t)) { await click(zB); await sleep(3200); await check(tagp + '_cek'); await click(zB); }
        await sleep(900);
        const t2 = await page.evaluate(() => (document.querySelector('#zB') || {}).textContent || '');
        if (t2 && !/^…/.test(t2)) await check(tagp + '_' + t2.split(' ')[0].toLowerCase());
      }
    };
    await playSteps('hazirla1');
    await waitFor(() => !!document.querySelector('#rvServe')); await check('inceleme_yanlis');
    // yeniden yap → doğru seçim
    await click('#rvRedo'); await check('yeniden_secim');
    await click(`[data-sd="${want.d}"]`); await click(`[data-sz="${want.z}"]`); await click('#selGo'); await sleep(300);
    await playSteps('hazirla2');
    await waitFor(() => !!document.querySelector('#rvServe')); await check('inceleme_dogru');
    await click('#rvServe'); await sleep(400); await check('servis_sonrasi');
    // gün içi pencereler
    await click('#icShop'); await check('tedarik_gun_ici'); await page.evaluate(() => document.querySelector('#supX').click()); await sleep(200);
    await click('#icPrice'); await check('fiyatlar_gun_ici'); await page.evaluate(() => document.querySelector('#prX').click()); await sleep(200);
    await click('#exitBtn'); await check('cikis_penceresi'); await clickText('Vazgeç');
    // günü bitir
    await page.evaluate(() => { const d = CEKIRDEK.day(); d.t = 149.5; d.toSpawn = 0; d.customers.forEach(c => { if (c.patienceMax) c.patience = 0.01; }); });
    await waitFor(() => document.querySelector('#ovLedger').classList.contains('on'), null, 20000); await sleep(400);
    await check('kapanis_teyze'); await mbtn('Tamam'); await sleep(300);
    await check('kira');
    await click('#rentNext'); await check('kapanis');
    await page.evaluate(() => { const c = document.querySelector('#ledgerCard'); c.scrollTop = c.scrollHeight; }); await check('kapanis_alt');
    if (!await page.evaluate(() => document.querySelector('#ledgerOk').disabled)) throw new Error('ilk gün temizlemeden Devam açık');
    await click('#cleanBtn'); await check('temizlik_teyze');
    for (let j = 0; j < 3; j++) { await page.evaluate(() => document.querySelector('#bfGo').click()); await sleep(1150); }
    await page.evaluate(() => { const c = document.querySelector('#ledgerCard'); c.scrollTop = c.scrollHeight; }); await check('kapanis_temiz');
    await click('#ledgerOk'); await sleep(300); await check('teyze_veda_aksam'); await mbtn('Devam'); await sleep(300);
    if (await page.evaluate(() => document.querySelector('#ovModal').classList.contains('on'))) { await check('gazete'); await clickText('Devam'); }
    await check('tedarik');
    await page.evaluate(() => { const c = document.querySelector('#shopCard'); c.scrollTop = c.scrollHeight / 2; }); await check('tedarik_orta');
    await page.evaluate(() => { const c = document.querySelector('#shopCard'); c.scrollTop = c.scrollHeight; }); await check('tedarik_alt');
    await click('#supNext'); await check('dukkan_gelistirme');
    await page.evaluate(() => { const c = document.querySelector('#hubCard'); c.scrollTop = c.scrollHeight; }); await check('dukkan_gelistirme_alt');
    for (const t of ['tools', 'loans', 'decor']) { await click(`[data-tab="${t}"]`); await check('dukkan_' + t); }
    await click('#goalBtn'); await check('ana_hedef'); await page.evaluate(() => document.querySelector('#goalX').click()); await sleep(200);
    await click('#hubNext'); await check('fiyatlar');
    await click('[data-pu]'); await check('fiyatlar_arti');
    await click('#prNext'); await sleep(900);
    for (const lb of ['Anladım', 'Anladım']) { await page.evaluate(l => { const b = [...document.querySelectorAll('#ovModal.on button')].find(x => x.textContent.trim() === l); if (b) b.click(); }, lb); await sleep(350); }
    await check('gun2_sahne');
    await click('#icBook'); await check('defter'); await page.evaluate(() => { const c = document.querySelector('#bookCard'); c.scrollTop = c.scrollHeight; }); await check('defter_alt'); await page.evaluate(() => document.querySelector('#bookX').click()); await sleep(200);
    await click('#icSettings'); await check('ayarlar'); await page.evaluate(() => document.querySelector('#setX').click()); await sleep(200);
    await click('#icMenu'); await check('menu_oyunici'); await click('#gmMenu'); await check('menu_onay'); await page.locator('#modalCard .mrow button.pri').click(); await sleep(600);
    await check('anamenu_devam');
  } catch (e) { console.log(`[${tag}] AKIŞ HATASI: ${e.message}`); results.push({ size: tag, name: 'AKIS', V: ['AKIŞ HATASI: ' + e.message], primaries: [] }); if (SHOTS) await page.screenshot({ path: `${OUT}/${tag}_ZZ_hata.png` }); }
  if (errs.length) { console.log(`[${tag}] JS hataları:\n  ` + errs.join('\n  ')); results.push({ size: tag, name: 'JS', V: errs.map(e => 'JS: ' + e), primaries: [] }); }
  await browser.close();
  return results;
}
(async () => {
  const all = [];
  for (const s of SIZES) all.push(...await run(s));
  fs.writeFileSync(OUT + '/audit_result.json', JSON.stringify(all, null, 1));
  const by = {}; all.forEach(r => { by[r.size] = by[r.size] || { screens: 0, v: 0 }; by[r.size].screens++; by[r.size].v += r.V.length; });
  console.log('\nÖZET'); Object.entries(by).forEach(([k, x]) => console.log(`${k}: ${x.screens} ekran, ${x.v} ihlal`));
})();

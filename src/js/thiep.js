/*
 * Các chức năng của thiệp: mở phong thư, nhạc nền, album + xem ảnh lớn, đếm ngược, bản đồ,
 * xác nhận tham dự + sổ lưu bút (gửi về Google Sheet), hộp quà, tên khách mời từ link.
 * Cấu hình (link Google Sheet, ngày giờ cưới...) được build.js đưa vào window.THIEP từ noi-dung.md.
 */
(function () {
  'use strict';
  var CFG = window.THIEP || {};
  var $ = function (id) { return document.getElementById(id); };
  var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var HEART = '<svg viewBox="0 0 24 24" fill="currentColor" width="1em" height="1em"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>';
  var MAU = ['#a8323b', '#7a1f26', '#c9a24a', '#ece4d8'];

  var cover = $('cover'), card = $('cover-card'), music = $('music'), musicButton = $('music-button');
  var state = 'closed', openTimers = [];

  function toast(chu) {
    $('toast').textContent = chu; $('toast').hidden = false;
    clearTimeout(toast.hen); toast.hen = setTimeout(function () { $('toast').hidden = true; }, 4500);
  }

  /* ---------------------------------------------------------------- tên khách mời trong link (?khach=...) */
  function tenKhachMoi() {
    var p = new URLSearchParams(location.search);
    return (p.get('khach') || p.get('guest-name') || '').trim();
  }
  var khach = tenKhachMoi();
  if (khach) document.querySelectorAll('[data-khach-moi]').forEach(function (el) { el.textContent = khach; });

  /* ---------------------------------------------------------------- nhạc nền */
  // Trình duyệt chỉ cho phát nhạc sau một cử chỉ thật (bấm, chạm, gõ phím). Thử phát ngay khi mở trang:
  // được phép thì nhạc vang lên luôn; bị chặn thì chờ khách bấm "Mở thiệp" (hoặc chạm bất kỳ đâu).
  var nguoiDungTat = false;
  var CU_CHI = ['pointerdown', 'click', 'touchend', 'keydown'];
  function syncMusic() {
    var dangPhat = !music.paused;
    musicButton.classList.toggle('playing', dangPhat);
    musicButton.setAttribute('aria-label', dangPhat ? 'Tạm dừng nhạc' : 'Phát nhạc');
    if (dangPhat) musicButton.hidden = false; // tự phát được thì hiện nút để khách tắt nếu muốn
  }
  function goLangNghe() { CU_CHI.forEach(function (ev) { document.removeEventListener(ev, tuPhatNhac, true); }); }
  function phatNhac() {
    if (!CFG.coNhac || nguoiDungTat) return Promise.resolve();
    music.volume = 0.5;
    var p = music.play();
    return p && p.then ? p.then(goLangNghe) : Promise.resolve(goLangNghe());
  }
  function tuPhatNhac(e) {
    if (e && musicButton.contains(e.target)) return; // nút loa tự xử lý
    phatNhac().catch(function () {});
  }
  if (CFG.coNhac) {
    CU_CHI.forEach(function (ev) { document.addEventListener(ev, tuPhatNhac, true); });
    phatNhac().catch(function () {});
  }
  music.addEventListener('play', syncMusic);
  music.addEventListener('pause', syncMusic);
  music.addEventListener('error', function () { if (CFG.coNhac) toast('Không đọc được file nhạc nền.'); });
  musicButton.onclick = function () {
    if (music.paused) { nguoiDungTat = false; phatNhac().catch(function () { toast('Nhấn nút nhạc để phát.'); }); }
    else { nguoiDungTat = true; music.pause(); }
  };

  /* ---------------------------------------------------------------- mở phong thư */
  function chime() {
    try {
      var ctx = new (window.AudioContext || window.webkitAudioContext)();
      [523.25, 659.25, 783.99, 1046.5, 1567.98, 2093].forEach(function (f, i) {
        var o = ctx.createOscillator(), g = ctx.createGain(), t = ctx.currentTime + i * 0.1;
        o.connect(g); g.connect(ctx.destination); o.frequency.value = f;
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.025, t + 0.01); g.gain.exponentialRampToValueAtTime(0.001, t + 1.8);
        o.start(t); o.stop(t + 1.8);
      });
      setTimeout(function () { ctx.close(); }, 3000);
    } catch (e) { /* không có Web Audio: bỏ qua */ }
  }
  function burst() {
    var box = document.createElement('div'); box.id = 'cover-burst';
    for (var i = 0; i < 32; i++) {
      var a = 2 * Math.PI * i / 32 + (Math.random() - 0.5) * 0.4, r = 25 + 60 * Math.random(), p = document.createElement('span');
      p.innerHTML = HEART;
      p.style.cssText = 'color:' + MAU[i % 4] + ';font-size:' + (10 + 16 * Math.random()) + 'px;--dx:' + Math.cos(a) * r * 5 + 'px;--dy:' + Math.sin(a) * r * 5 +
        'px;--rot-start:' + (Math.random() - 0.5) * 30 + 'deg;--rot-end:' + (Math.random() - 0.5) * 360 + 'deg;animation-delay:' + Math.random() * 0.15 + 's';
      box.append(p);
    }
    cover.append(box);
  }
  function open() {
    if (state !== 'closed') return;
    state = 'opening';
    $('open-invitation').setAttribute('aria-busy', 'true');
    cover.classList.add('opening');
    chime();
    phatNhac().catch(function () { toast('Nhấn nút nhạc để phát.'); });
    var ring = document.createElement('div'); ring.className = 'seal-ring'; card.append(ring);
    cover.querySelectorAll('[data-cover-flower]').forEach(function (flower) {
      var fly = document.createElement('div'); fly.className = 'fly-flower';
      var img = flower.cloneNode(true);
      img.removeAttribute('data-cover-flower');
      img.style.setProperty('--fly-scale-x', img.classList.contains('-scale-x-100') ? '-1' : '1');
      img.classList.remove('-scale-x-100');
      fly.append(img); card.append(fly);
    });
    openTimers.push(setTimeout(function () { cover.classList.add('away'); burst(); }, reduced ? 0 : 500));
    openTimers.push(setTimeout(function () {
      cover.hidden = true;
      $('invitation').hidden = false;
      document.documentElement.classList.remove('invitation-locked');
      fitNames();
      window.scrollTo(0, 0);
      state = 'open';
      musicButton.hidden = !CFG.coNhac;
      $('gift-fab').hidden = !!$('gift-button').closest('[hidden]'); // phần hộp quà bị ẩn thì không hiện nút nổi
      loadMap();
      scheduleCarousel();
    }, reduced ? 10 : 1300));
  }
  $('open-invitation').onclick = function (e) { e.preventDefault(); open(); };
  $('open-invitation').onkeydown = function (e) { if (e.key === ' ') { e.preventDefault(); open(); } };

  /* Họ tên dài: thu nhỏ chữ cho vừa một dòng (tối thiểu 22px) */
  function fitNames() {
    var names = document.querySelectorAll('h3[data-field="Họ tên chú rể"],h3[data-field="Họ tên cô dâu"]');
    var ctx = document.createElement('canvas').getContext('2d'), size = 43;
    names.forEach(function (e) {
      ctx.font = '43px ' + getComputedStyle(e).fontFamily;
      var w = e.getBoundingClientRect().width;
      size = Math.min(size, Math.floor(43 * w / Math.max(w, ctx.measureText(e.textContent).width * 1.03)));
    });
    names.forEach(function (e) { e.style.fontSize = Math.max(22, size) + 'px'; });
  }
  window.addEventListener('resize', function () { if (!$('invitation').hidden) fitNames(); });

  /* ---------------------------------------------------------------- bản đồ (chỉ tải khi đã mở thiệp) */
  function loadMap() {
    var frame = $('map-frame');
    if (!frame || frame.src || !frame.dataset.src || frame.closest('[hidden]')) return;
    frame.src = frame.dataset.src;
  }

  /* ---------------------------------------------------------------- album: vòng xoay 3D + xem ảnh lớn */
  var cards = [].slice.call($('album-cards').children), dots = [].slice.call($('album-dots').children);
  var thumbs = [].slice.call($('lightbox-thumbs').children), n = cards.length, index = 0, timer = null;
  function select(i) {
    if (!n) return;
    index = (i + n) % n;
    cards.forEach(function (el, j) {
      var off = j - index;
      if (off > n / 2) off -= n;
      if (off < -n / 2) off += n;
      var k = Math.abs(off);
      el.style.transform = 'translateX(' + off * 60 + '%) translateZ(' + -k * 150 + 'px) rotateY(' + off * 45 + 'deg) scale(' + (k === 0 ? 1 : k === 1 ? 0.85 : 0.7) + ')';
      el.style.opacity = k === 0 ? '1' : k === 1 ? '.75' : k === 2 ? '.5' : '.3';
      el.style.zIndex = 100 - k;
      el.classList.toggle('ring-2', k === 0);
      el.classList.toggle('ring-white/30', k === 0);
    });
    dots.forEach(function (el, j) {
      el.className = 'rounded-full transition-all duration-300 h-2 bg-current ' + (j === index ? 'w-6 opacity-70' : 'w-2 opacity-25 hover:opacity-40');
      el.setAttribute('aria-current', j === index ? 'true' : 'false');
    });
  }
  cards.forEach(function (el, i) {
    el.onclick = function () { if (i === index) openLightbox(i); else select(i); };
    el.onkeydown = function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); el.click(); } };
  });
  dots.forEach(function (el, i) { el.onclick = function () { select(i); }; });
  thumbs.forEach(function (el, i) { el.onclick = function () { index = i; updateLightbox(); }; });
  select(0);

  var stage = $('album-stage'), touchStart = 0;
  stage.querySelector('[aria-label="Previous photo"]').onclick = function () { select(index - 1); };
  stage.querySelector('[aria-label="Next photo"]').onclick = function () { select(index + 1); };
  stage.addEventListener('pointerenter', function () { clearInterval(timer); });
  stage.addEventListener('pointerleave', function () { if (state === 'open') scheduleCarousel(); });
  function swipe(el, handler) {
    var single = false;
    el.addEventListener('touchstart', function (e) { single = e.touches.length === 1; touchStart = e.touches[0].clientX; }, { passive: true });
    el.addEventListener('touchend', function (e) {
      var dx = e.changedTouches[0].clientX - touchStart;
      if (single && Math.abs(dx) > 45 && !(el.id === 'lightbox-image' && zoom > 1)) handler(dx < 0 ? 1 : -1);
    }, { passive: true });
  }
  swipe(stage, function (d) { select(index + d); });
  function scheduleCarousel() {
    clearInterval(timer);
    if (!reduced && n > 1) timer = setInterval(function () { if (!$('lightbox').open && !document.hidden) select(index + 1); }, 1500);
  }

  var zoom = 1, panX = 0, panY = 0, drag = null, pinch = null, lightboxImage = $('lightbox-image');
  function paintZoom() { lightboxImage.style.transform = 'translate(' + panX + 'px,' + panY + 'px) scale(' + zoom + ')'; lightboxImage.style.cursor = zoom > 1 ? 'grab' : 'default'; }
  function resetZoom() { zoom = 1; panX = panY = 0; paintZoom(); }
  function updateLightbox() {
    if (!cards[index]) return;
    resetZoom();
    var img = cards[index].querySelector('img');
    lightboxImage.src = img.getAttribute('src');
    lightboxImage.alt = img.alt;
    $('lightbox-count').textContent = (index + 1) + ' / ' + n;
    thumbs.forEach(function (el, i) { el.setAttribute('aria-current', i === index ? 'true' : 'false'); });
  }
  function openLightbox(i) { index = i; updateLightbox(); $('lightbox').showModal(); }
  function step(d) { index = (index + d + n) % n; updateLightbox(); }
  $('lightbox').querySelector('[aria-label="Previous image"]').onclick = function () { step(-1); };
  $('lightbox').querySelector('[aria-label="Next image"]').onclick = function () { step(1); };
  swipe(lightboxImage, step);
  lightboxImage.ondblclick = function () { if (zoom > 1) resetZoom(); else { zoom = 2; paintZoom(); } };
  $('lightbox').onclose = function () { resetZoom(); select(index); };
  lightboxImage.addEventListener('wheel', function (e) {
    e.preventDefault();
    zoom = Math.max(1, Math.min(4, zoom * Math.exp(-e.deltaY * 0.002)));
    if (zoom === 1) panX = panY = 0;
    paintZoom();
  }, { passive: false });
  lightboxImage.addEventListener('pointerdown', function (e) {
    if (zoom <= 1 || e.pointerType === 'touch') return;
    drag = { x: e.clientX, y: e.clientY, px: panX, py: panY };
    lightboxImage.setPointerCapture(e.pointerId);
  });
  lightboxImage.addEventListener('pointermove', function (e) { if (drag) { panX = drag.px + e.clientX - drag.x; panY = drag.py + e.clientY - drag.y; paintZoom(); } });
  lightboxImage.addEventListener('pointerup', function () { drag = null; });
  var distance = function (t) { return Math.hypot(t[1].clientX - t[0].clientX, t[1].clientY - t[0].clientY); };
  lightboxImage.addEventListener('touchstart', function (e) {
    if (e.touches.length === 2) pinch = { distance: distance(e.touches), zoom: zoom };
    else if (zoom > 1) drag = { x: e.touches[0].clientX, y: e.touches[0].clientY, px: panX, py: panY };
  }, { passive: true });
  lightboxImage.addEventListener('touchmove', function (e) {
    if (pinch && e.touches.length === 2) { e.preventDefault(); zoom = Math.max(1, Math.min(4, pinch.zoom * distance(e.touches) / pinch.distance)); paintZoom(); }
    else if (drag && e.touches.length === 1) { e.preventDefault(); panX = drag.px + e.touches[0].clientX - drag.x; panY = drag.py + e.touches[0].clientY - drag.y; paintZoom(); }
  }, { passive: false });
  lightboxImage.addEventListener('touchend', function () { pinch = drag = null; });
  document.addEventListener('keydown', function (e) {
    if ($('lightbox').open && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) { e.preventDefault(); step(e.key === 'ArrowRight' ? 1 : -1); }
  });

  /* ---------------------------------------------------------------- hộp thoại */
  $('rsvp-button').onclick = function () { $('rsvp-dialog').showModal(); };
  $('gift-button').onclick = $('gift-fab').onclick = function () { $('gift-dialog').showModal(); };
  document.querySelectorAll('[data-close]').forEach(function (e) { e.onclick = function () { e.closest('dialog').close(); }; });
  document.querySelectorAll('dialog').forEach(function (d) {
    d.addEventListener('click', function (e) {
      if (e.target !== d) return;
      var r = d.getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) d.close();
    });
  });

  /* ---------------------------------------------------------------- gửi về Google Sheet */
  // Gửi kiểu no-cors (Apps Script không trả CORS): không đọc được kết quả, chỉ biết đã gửi đi.
  function guiSheet(loai, duLieu) {
    if (!CFG.linkGoogleSheet) {
      console.warn('Chưa có "Lời chúc - link Google Sheet" trong noi-dung.md: dữ liệu không được lưu.');
      return Promise.resolve();
    }
    var body = new URLSearchParams();
    body.append('loai', loai);
    Object.keys(duLieu).forEach(function (k) { body.append(k, duLieu[k]); });
    body.append('khach_moi', khach || '');
    body.append('link', location.href);
    return fetch(CFG.linkGoogleSheet, { method: 'POST', mode: 'no-cors', body: body });
  }
  function read(key) { try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch (e) { return []; } }
  function save(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* bộ nhớ bị chặn: bỏ qua */ } }

  var rsvp = $('rsvp-form'), dangGui = false;
  // Khách mở link riêng (link ngắn hoặc ?khach=): điền sẵn tên
  var tenTrenThiep = (document.querySelector('[data-khach-moi]') || {}).textContent || '';
  var khachMoi = (khach || tenTrenThiep).trim();
  if (khachMoi) rsvp.elements.name.value = khachMoi;
  // Lưu xác nhận về máy chủ (Cloudflare KV / máy xem thử), xem ở trang /thong-ke/
  function guiXacNhan(duLieu) {
    return fetch('api/xac-nhan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(duLieu),
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (d) {
        if (!r.ok || !d.ok) throw new Error(d.loi || 'Máy chủ lỗi ' + r.status);
      });
    });
  }
  function updateRsvp() {
    var attending = rsvp.elements.attending.value;
    $('rsvp-count').hidden = attending !== 'yes';
    rsvp.querySelector('[type=submit]').disabled = dangGui || !rsvp.elements.name.value.trim() || !attending;
  }
  rsvp.addEventListener('input', updateRsvp);
  rsvp.addEventListener('change', updateRsvp);
  rsvp.onsubmit = function (e) {
    e.preventDefault();
    var ten = rsvp.elements.name.value.trim(), co = rsvp.elements.attending.value;
    if (!ten || !co || dangGui) return;
    dangGui = true; updateRsvp();
    var soNguoi = co === 'yes' ? rsvp.elements.count.value : '0';
    guiSheet('xac-nhan', { ho_ten: ten, tham_du: co === 'yes' ? 'Có' : 'Không', so_nguoi: soNguoi }).catch(function () { /* Sheet chỉ là bản phụ */ });
    guiXacNhan({ ben: CFG.ben, ten: ten, thamDu: co === 'yes' ? 'co' : 'khong', soNguoi: soNguoi, khachMoi: khachMoi, duongDan: location.pathname })
      .then(function () {
        $('rsvp-dialog').close(); rsvp.reset();
        if (khachMoi) rsvp.elements.name.value = khachMoi;
        toast(co === 'yes' ? 'Cảm ơn bạn đã xác nhận! Hẹn gặp bạn trong ngày vui.' : 'Cảm ơn bạn đã báo cho chúng tôi!');
      }, function () { toast('Gửi chưa được, bạn kiểm tra kết nối mạng rồi thử lại nhé!'); })
      .then(function () { dangGui = false; updateRsvp(); });
  };

  function addWish(row) {
    var box = document.createElement('div');
    box.className = 'rounded-[8px] border p-4 text-sm';
    box.style.cssText = 'border-color:#51141955;background-color:rgba(255,255,255,0.55)';
    var header = document.createElement('div'); header.className = 'flex items-start justify-between';
    var name = document.createElement('span'); name.className = 'font-semibold'; name.style.color = '#511419'; name.textContent = row.name;
    var date = document.createElement('span'); date.className = 'text-xs opacity-70';
    date.textContent = new Date(row.date).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
    header.append(name, date);
    var p = document.createElement('p'); p.className = 'mt-2 leading-relaxed'; p.textContent = row.message;
    box.append(header, p);
    $('comments').prepend(box);
  }
  // Lời chúc khách đã gửi từ máy này (lời chúc của mọi người nằm trong Google Sheet)
  read('thiep-loi-chuc').forEach(addWish);
  var wish = $('guestbook-form');
  wish.onsubmit = function (e) {
    e.preventDefault();
    var row = { name: wish.querySelector('input').value.trim(), message: wish.querySelector('textarea').value.trim(), date: new Date().toISOString() };
    if (!row.name || !row.message) return;
    var nut = wish.querySelector('[type=submit]'); nut.disabled = true;
    guiSheet('loi-chuc', { ho_ten: row.name, loi_chuc: row.message })
      .then(function () {
        save('thiep-loi-chuc', read('thiep-loi-chuc').concat([row]));
        addWish(row); wish.reset();
        toast('Cảm ơn bạn đã gửi lời chúc!');
      }, function () { toast('Gửi chưa được, bạn kiểm tra kết nối mạng rồi thử lại nhé!'); })
      .then(function () { nut.disabled = false; });
  };
  $('wish-suggestion').onclick = function () {
    var g = CFG.goiYLoiChuc || [];
    if (g.length) wish.querySelector('textarea').value = g[Math.floor(Math.random() * g.length)];
  };

  /* ---------------------------------------------------------------- hộp quà: lưu QR */
  document.querySelectorAll('[data-save-qr]').forEach(function (btn, i) {
    btn.onclick = function () {
      var img = btn.parentElement.querySelector('img');
      if (!img || !img.getAttribute('src')) return;
      var a = document.createElement('a');
      a.href = img.src;
      a.download = 'QR-mung-cuoi-' + (i === 0 ? 'chu-re' : 'co-dau') + ((a.href.match(/\.\w+$/) || ['.png'])[0]);
      document.body.appendChild(a); a.click(); a.remove();
    };
  });

  /* ---------------------------------------------------------------- hoa trang trí trôi nhẹ khi cuộn */
  if (!reduced) {
    var flowers = [].slice.call($('invitation').querySelectorAll('span[style]')).filter(function (e) {
      return e.style.willChange === 'transform' && !e.style.animation && e.firstElementChild && e.firstElementChild.tagName === 'SPAN';
    });
    var parallax = function () { flowers.forEach(function (e) { e.style.transform = 'translateY(' + Math.min(scrollY * 0.16, 40) + 'px)'; }); };
    window.addEventListener('scroll', parallax, { passive: true });
    window.addEventListener('resize', parallax);
    parallax();
  }

  /* ---------------------------------------------------------------- đếm ngược */
  var wedding = new Date(CFG.thoiDiemCuoi);
  if (+wedding > Date.now()) {
    var countdown = $('countdown');
    countdown.hidden = false;
    var o = {};
    countdown.querySelectorAll('[data-dem]').forEach(function (e) { o[e.getAttribute('data-dem')] = e; });
    var p2 = function (n) { return (n < 10 ? '0' : '') + n; };
    var demTimer;
    var tick = function () {
      var diff = Math.max(0, Math.floor((+wedding - Date.now()) / 1000));
      o.ngay.textContent = Math.floor(diff / 86400);
      o.gio.textContent = p2(Math.floor(diff % 86400 / 3600));
      o.phut.textContent = p2(Math.floor(diff % 3600 / 60));
      o.giay.textContent = p2(diff % 60);
      if (!diff) clearInterval(demTimer);
    };
    tick(); demTimer = setInterval(tick, 1000);
  }

  if (new URLSearchParams(location.search).get('open') === '1') open();
  window.THIEP_TRANG_THAI = { get state() { return state; }, get albumIndex() { return index; } };
})();

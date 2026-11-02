#!/usr/bin/env node
/*
 * Tạo website thiệp cưới từ noi-dung.md + src/ + anh/ + nhac/  →  thư mục website/
 *
 *   node build.js           tạo website/ (thiệp nhà trai ở /nha-trai/, nhà gái ở /nha-gai/, mỗi bên có /tao-link/)
 *   node build.js --serve   tạo website/, mở máy chủ xem thử và tự tạo lại khi bạn sửa file
 *
 * Không cần cài thêm thư viện nào (chỉ cần Node.js 18+).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const http = require('http');

const GOC = __dirname;
const RA = path.join(GOC, 'website');
const FILE_NOI_DUNG = path.join(GOC, 'noi-dung.md');

class LoiNoiDung extends Error {}

/* ------------------------------------------------------------------ đọc noi-dung.md */
function chuanHoa(nhan) {
  return nhan.normalize('NFC').trim().replace(/\s+/g, ' ').toLowerCase();
}

function docNoiDung() {
  const dong = fs.readFileSync(FILE_NOI_DUNG, 'utf8').replace(/^﻿/, '').split(/\r?\n/);
  const batDau = dong.findIndex((d) => d.trim() === '---'); // phần giải thích ở đầu file bỏ qua
  const muc = new Map();
  dong.slice(batDau + 1).forEach((d, i) => {
    const m = d.match(/^\s*[-*]\s+([^:]+?)\s*:\s?(.*)$/);
    if (!m) return;
    const khoa = chuanHoa(m[1]);
    if (muc.has(khoa)) console.warn(`⚠️  noi-dung.md dòng ${batDau + i + 2}: mục "${m[1]}" bị lặp, dùng giá trị sau cùng.`);
    muc.set(khoa, { nhan: m[1].trim(), giaTri: m[2].trim() });
  });
  return muc;
}

/* ------------------------------------------------------------------ hai bản thiệp: nhà trai, nhà gái */
// Thiệp nhà gái dùng chung nội dung với nhà trai, trừ các mục "Nhà gái - <tên mục>" đã điền trong noi-dung.md
const CAC_BEN = [
  { ben: 'nha-trai', ten: 'Nhà trai', tienTo: 'Nhà trai - ' },
  { ben: 'nha-gai', ten: 'Nhà gái', tienTo: 'Nhà gái - ' },
];
const LA_MUC_RIENG = /^nhà (trai|gái)\s*-\s*/i;
// Các mục đánh số: điền một dòng trong nhóm là thay cả nhóm (vd. cả lịch trình)
const NHOM_DANH_SO = [/^lịch trình \d+ -/, /^album ảnh /, /^trang phục - màu/];

function mucTheoBen(muc, { tienTo, ten }) {
  const t = chuanHoa(tienTo);
  const rieng = [...muc].filter(([k]) => k.startsWith(t))
    // Ghi "-" nghĩa là để trống hẳn mục đó (không lấy giá trị chung)
    .map(([k, m]) => [k.slice(t.length).trim(), { nhan: m.nhan.normalize('NFC').replace(LA_MUC_RIENG, ''), giaTri: m.giaTri === '-' ? '' : m.giaTri, ghi: !!m.giaTri }]);
  const kq = new Map([...muc].filter(([k]) => !LA_MUC_RIENG.test(k)));
  const thayNhom = NHOM_DANH_SO.filter((re) => rieng.some(([k, m]) => re.test(k) && m.ghi));
  for (const re of thayNhom) for (const k of [...kq.keys()]) if (re.test(k)) kq.delete(k);
  // Một mốc lịch trình (giờ + hoạt động + biểu tượng) để trống cả 3 dòng thì bỏ mốc đó
  const moc = (k) => (/^(lịch trình \d+) -/.exec(k) || [, k])[1];
  const mocCoChu = new Set(rieng.filter(([, m]) => m.ghi).map(([k]) => moc(k)));
  const chuaDien = [];
  for (const [k, m] of rieng) {
    if (m.ghi || (thayNhom.some((re) => re.test(k)) && mocCoChu.has(moc(k)))) kq.set(k, m);
    else if (!NHOM_DANH_SO.some((re) => re.test(k))) chuaDien.push(m.nhan);
  }
  if (chuaDien.length) console.warn(`ℹ️  Thiệp ${ten.toLowerCase()} chưa điền (đang dùng giống phần chung): ${chuaDien.join(', ')}`);
  return kq;
}

/* ------------------------------------------------------------------ tiện ích */
const escHtml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escAttr = (s) => escHtml(s).replace(/"/g, '&quot;');
// "|" = xuống dòng, "\|" = ký tự | thật
const GACH = '\u0000';
const nhieuDong = (s) => s.replace(/\\\|/g, GACH).split('|').map((x) => escHtml(x.trim()).replace(/\u0000/g, '|')).join('<br>');
const laLinkNgoai = (s) => /^(https?:)?\/\//i.test(s) || s.startsWith('data:');

function taoBoDoc(muc) {
  const thieu = new Set();
  const lay = (nhan) => {
    const m = muc.get(chuanHoa(nhan));
    if (!m) { thieu.add(nhan); return ''; }
    return m.giaTri;
  };
  return { lay, thieu };
}

function kiemTraFile(duongDan, nhan) {
  if (!duongDan || laLinkNgoai(duongDan)) return;
  const p = path.join(GOC, decodeURI(duongDan));
  if (!fs.existsSync(p)) console.warn(`⚠️  "${nhan}": không tìm thấy file ${duongDan}`);
}

/* ------------------------------------------------------------------ các phần được tính toán (riêng mẫu Minimalism Đỏ Đậm) */
const THU = ['CHỦ NHẬT', 'THỨ HAI', 'THỨ BA', 'THỨ TƯ', 'THỨ NĂM', 'THỨ SÁU', 'THỨ BẢY'];
const TIM = '<svg viewBox="0 0 24 24" fill="currentColor" width="1em" height="1em" class="absolute inset-0 w-full h-full drop-shadow-sm"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>';
// Mục "ẩn/hiện" trong noi-dung.md -> {{@an-…}} trong thiep.html
const AN_HIEN = {
  'Hiện album ảnh (có/không)': 'album',
  'Hiện nút thêm vào lịch (có/không)': 'them-lich',
  'Hiện nút xác nhận tham dự (có/không)': 'xac-nhan',
  'Hiện bản đồ (có/không)': 'ban-do',
  'Hiện dress code (có/không)': 'dress-code',
  'Hiện lịch trình (có/không)': 'lich-trinh',
  'Hiện sổ lưu bút (có/không)': 'so-luu-but',
  'Hiện hộp quà mừng (có/không)': 'hop-qua',
};

function docNgay(lay) {
  const v = lay('Ngày cưới');
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(v);
  const d = m && new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  if (!d || d.getUTCDate() !== +m[3]) throw new LoiNoiDung(`"Ngày cưới" phải có dạng NĂM-THÁNG-NGÀY, vd. 2026-11-28 (đang là "${v}").`);
  return { nam: +m[1], thang: +m[2], ngay: +m[3], thu: d.getUTCDay() };
}
function docGio(lay, nhan) {
  const v = lay(nhan);
  if (!/^([01]?\d|2[0-3]):[0-5]\d$/.test(v)) throw new LoiNoiDung(`"${nhan}" phải có dạng GIỜ:PHÚT, vd. 18:00 (đang là "${v}").`);
  return v.padStart(5, '0');
}

// Lịch tháng cưới: ô trống đầu tháng (tuần bắt đầu thứ 2) + các ngày, ngày cưới có trái tim
function taoLich(d) {
  const o = 'flex items-center justify-center h-[30px] md:h-[34px]';
  const thuDau = (new Date(Date.UTC(d.nam, d.thang - 1, 1)).getUTCDay() + 6) % 7;
  const soNgay = new Date(Date.UTC(d.nam, d.thang, 0)).getUTCDate();
  let html = `<div class="${o}"></div>`.repeat(thuDau);
  for (let i = 1; i <= soNgay; i++) {
    html += i === d.ngay
      ? `<div class="${o}"><div class="relative w-[26px] h-[24px] md:w-[30px] md:h-[28px] flex items-center justify-center">${TIM}<span class="relative z-10 text-[11px] md:text-[12px] font-bold" style="color:#fff">${i}</span></div></div>`
      : `<div class="${o}"><span class="text-[12px] md:text-[13px]">${i}</span></div>`;
  }
  return html;
}

// Các mục đánh số (Album ảnh 01, Lịch trình 1 - giờ…) theo đúng thứ tự trong noi-dung.md
function cacMuc(muc, tienTo) {
  return [...muc.values()].filter((m) => chuanHoa(m.nhan).startsWith(chuanHoa(tienTo)));
}

function taoAlbum(muc) {
  const anh = cacMuc(muc, 'Album ảnh ').map((m) => m.giaTri).filter(Boolean);
  anh.forEach((a, i) => kiemTraFile(a, `Album ảnh ${i + 1}`));
  const src = (a) => escAttr(laLinkNgoai(a) ? a : encodeURI(a));
  return {
    '@album-the': anh.map((a, i) => `<div class="absolute h-[92%] rounded-2xl overflow-hidden shadow-xl cursor-pointer transition-all ease-in-out" role="button" tabindex="0" aria-label="Xem ảnh cưới ${i + 1}"><img src="${src(a)}" alt="Ảnh cưới ${i + 1}" class="h-full w-full object-cover" style="object-position:50% 50%"></div>`).join(''),
    '@album-cham': anh.map((a, i) => `<button type="button" aria-label="Go to photo ${i + 1}"></button>`).join(''),
    '@album-thu-nho': anh.map((a, i) => `<button type="button" class="flex-shrink-0 h-12 w-12 sm:h-16 sm:w-16 rounded-md sm:rounded-lg overflow-hidden transition-all duration-200 opacity-60 hover:opacity-100" aria-label="View image ${i + 1}"><img src="${src(a)}" alt="Thumbnail ${i + 1}" class="h-full w-full object-cover" loading="lazy"></button>`).join(''),
    '@album-so-anh': String(anh.length),
    '@album-anh-dau': anh.length ? src(anh[0]) : '',
    soAnh: anh.length,
  };
}

function taoLichTrinh(muc, lay) {
  const so = [...new Set(cacMuc(muc, 'Lịch trình ').map((m) => (/^Lịch trình (\d+) -/i.exec(m.nhan) || [])[1]).filter(Boolean))];
  return so.map((n, i) => {
    const gio = docGio(lay, `Lịch trình ${n} - giờ`);
    const viec = lay(`Lịch trình ${n} - hoạt động`);
    const icon = lay(`Lịch trình ${n} - biểu tượng`);
    kiemTraFile(icon, `Lịch trình ${n} - biểu tượng`);
    const anhIcon = icon ? `<span class="absolute top-1/2 flex items-center justify-center -translate-y-1/2 right-full" style="margin-right:22px"><img src="${escAttr(encodeURI(icon))}" alt="" class="block shrink-0 object-contain" style="width:64px;height:64px;max-width:none"></span>` : '';
    // Khoảng cách giữa các mốc (row-gap của #timeline-list trong thiep.html) là 52px, đường kẻ nối kéo dài 3.5rem cho liền
    const tren = i === 0 ? '50%' : '-3.5rem', duoi = i === so.length - 1 ? '50%' : '-3.5rem';
    return `<li class="contents"><span class="pt-0.5 text-right text-[16px] md:text-[17px] tabular-nums tracking-wide leading-snug" style="color:#ece4d8;font-family:&quot;Times New Roman&quot;, serif"><span class="relative inline-block">${anhIcon}${gio}</span></span>`
      + `<span aria-hidden="true" class="relative flex items-center justify-center self-stretch"><span class="absolute left-1/2 -translate-x-1/2 w-px" style="top:${tren};bottom:${duoi};background-color:color-mix(in srgb, #ece4d8 40%, transparent)"></span><span class="relative block h-2.5 w-2.5 rounded-full" style="background-color:#ece4d8;box-shadow:0 0 0 2px color-mix(in srgb, #ece4d8 13%, transparent)"></span></span>`
      + `<span class="text-[13px] md:text-[15px]" style="color:rgba(236,228,216,0.7);font-family:&quot;Times New Roman&quot;, serif"><span dir="auto">${escHtml(viec)}</span></span></li>`;
  }).join('');
}

function taoMauTrangPhuc(muc) {
  return cacMuc(muc, 'Trang phục - màu').map((m) => {
    const k = /^(#[0-9a-f]{6})\s*(?:\((.*)\))?\s*$/i.exec(m.giaTri);
    if (!k) throw new LoiNoiDung(`"${m.nhan}" phải là mã màu #RRGGBB, có thể kèm tên trong ngoặc (đang là "${m.giaTri}").`);
    const vien = k[1].toLowerCase() === '#ece4d8' ? ';border:1.5px solid #51141930' : '';
    return `<div class="w-10 h-10 md:w-12 md:h-12 rounded-full shadow-md" style="background-color:${k[1]}${vien}" title="${escAttr(k[2] || k[1])}"></div>`;
  }).join('');
}

// Google Maps: lấy toạ độ ghim / tham số q trong link để nhúng bản đồ; link rút gọn thì nhúng theo địa chỉ
function banDo(link, diaChi, toaDo) {
  // Toạ độ "vĩ độ,kinh độ" ghim chắc chắn nhất: địa chỉ chữ dài thường không tìm ra địa điểm khi mở bằng điện thoại
  let q = /^\s*-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?\s*$/.test(toaDo) ? toaDo.replace(/\s+/g, '') : '';
  if (!q && link) {
    let s = link;
    try { s = decodeURIComponent(link); } catch (e) { /* giữ nguyên */ }
    const khop = s.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/) || s.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
    if (khop) q = `${khop[1]},${khop[2]}`;
    else {
      try {
        const u = new URL(link);
        q = u.searchParams.get('q') || u.searchParams.get('query') || u.searchParams.get('destination') || '';
      } catch (e) { console.warn('⚠️  "Link Google Maps" không phải link hợp lệ.'); }
    }
  }
  q = q || diaChi.replace(/\s*\|\s*/g, ' ');
  return {
    nhung: 'https://www.google.com/maps?q=' + encodeURIComponent(q) + '&z=16&output=embed',
    chiDuong: link || linkChiDuong(diaChi),
  };
}

function linkThemLich(lay, d, gio) {
  const p = (x) => String(x).padStart(2, '0');
  const bd = new Date(`${d.nam}-${p(d.thang)}-${p(d.ngay)}T${gio}:00+07:00`);
  const kt = new Date(+bd + 2 * 3600e3);
  const dang = (t) => t.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const ten = `Đám cưới ${lay('Họ tên chú rể')} & ${lay('Họ tên cô dâu')}`;
  const noi = lay('Nơi tổ chức tiệc').replace(/\s*\|\s*/g, ' ');
  return 'https://www.google.com/calendar/render?' + new URLSearchParams({
    action: 'TEMPLATE', text: ten, dates: `${dang(bd)}/${dang(kt)}`, ctz: 'Asia/Ho_Chi_Minh', details: `${ten} tại ${noi}`, location: noi,
  });
}

const laKhong = (v) => /^(không|khong|ko|no|0|ẩn)$/i.test(v.trim());

// Link mở Google Maps chỉ đường tới một địa chỉ (dấu "|" tính là khoảng trắng)
function linkChiDuong(diaChi) {
  const d = diaChi.replace(/\s*\|\s*/g, ' ').replace(/\s+/g, ' ').trim();
  return d ? 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(d) : '#';
}

function chuanHoaGoc(goc) {
  goc = (goc || '/').trim();
  if (!goc.startsWith('/')) goc = '/' + goc;
  if (!goc.endsWith('/')) goc += '/';
  return goc;
}

// Đọc kích thước ảnh JPEG/PNG từ phần đầu file (không cần thư viện) để khai báo cho Zalo/Facebook
function kichThuocAnh(duongDan) {
  try {
    const b = fs.readFileSync(path.join(GOC, decodeURI(duongDan)));
    if (b.readUInt32BE(0) === 0x89504e47) return { rong: b.readUInt32BE(16), cao: b.readUInt32BE(20) };
    let i = 2;
    while (i < b.length) {
      if (b[i] !== 0xff) { i++; continue; }
      const loai = b[i + 1];
      if (loai >= 0xc0 && loai <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(loai)) return { rong: b.readUInt16BE(i + 7), cao: b.readUInt16BE(i + 5) };
      i += 2 + b.readUInt16BE(i + 2);
    }
  } catch (e) { /* bỏ qua: chỉ là thông tin phụ */ }
  return null;
}

function diaChiDayDu(lay, duongDan) {
  if (!duongDan || laLinkNgoai(duongDan)) return duongDan;
  const web = lay('Địa chỉ website').replace(/\/+$/, '');
  return web + chuanHoaGoc(lay('Đường dẫn gốc')) + encodeURI(duongDan);
}

/* ------------------------------------------------------------------ điền template */
// "Cô dâu đứng trước": khung thiệp ghi chú rể/nhà trai trước, nên đổi chỗ các cặp mục khi điền
const CAP_DOI_CHO = [
  ['Tên chú rể', 'Tên cô dâu'], ['Bố chú rể', 'Bố cô dâu'], ['Mẹ chú rể', 'Mẹ cô dâu'],
  ['Địa chỉ nhà trai', 'Địa chỉ nhà gái'], ['Họ tên chú rể', 'Họ tên cô dâu'], ['Vai vế chú rể', 'Vai vế cô dâu'],
];
function doiCho(lay) {
  const doi = new Map(CAP_DOI_CHO.flatMap(([a, b]) => [[chuanHoa(a), b], [chuanHoa(b), a]]));
  return (nhan) => lay(doi.get(chuanHoa(nhan)) || nhan);
}

function dien(template, lay, tinhSan) {
  return template.replace(/\{\{\s*(?:(attr|url):)?([^}]+?)\s*\}\}/g, (_, kieu, ten) => {
    if (ten.startsWith('@')) {
      if (!(ten in tinhSan)) throw new Error(`Template dùng {{${ten}}} nhưng build.js chưa tính.`);
      return tinhSan[ten];
    }
    const v = lay(ten);
    if (kieu === 'attr') return escAttr(v.replace(/\\\|/g, GACH).replace(/\s*\|\s*/g, ' ').replace(/\u0000/g, '|'));
    if (kieu === 'url') { kiemTraFile(v, ten); return escAttr(laLinkNgoai(v) ? v : encodeURI(v)); }
    return nhieuDong(v);
  });
}

// HTML thiệp + trang tạo link của một bên
function taoTrang(muc, ben) {
  const { lay, thieu } = taoBoDoc(muc);

  const goc = chuanHoaGoc(lay('Đường dẫn gốc'));
  const d = docNgay(lay);
  docGio(lay, 'Giờ làm lễ');
  // Hai giờ này được để trống: không có giờ kết thúc ("VÀO LÚC 07:00"), không có dòng "Đón khách"
  if (lay('Giờ làm lễ kết thúc')) docGio(lay, 'Giờ làm lễ kết thúc');
  if (lay('Giờ đón khách')) docGio(lay, 'Giờ đón khách');
  const gioTiec = docGio(lay, 'Giờ khai tiệc');
  const album = taoAlbum(muc);
  const bd = banDo(lay('Link Google Maps'), lay('Nơi tổ chức tiệc').replace(/\s*\|\s*/g, ' '), lay('Bản đồ - toạ độ'));
  const nhac = lay('Nhạc nền');
  const p2 = (x) => String(x).padStart(2, '0');

  const cauHinh = {
    coNhac: !!nhac,
    ben: ben.ben,
    thoiDiemCuoi: `${d.nam}-${p2(d.thang)}-${p2(d.ngay)}T${gioTiec}:00+07:00`,
    linkGoogleSheet: lay('Lời chúc - link Google Sheet') || '',
    goiYLoiChuc: lay('Lời chúc - gợi ý').split('|').map((s) => s.trim()).filter(Boolean),
  };
  const tinhSan = {
    // Phần trước dấu | đầu tiên là tên nơi tiệc (in to hơn); phần sau là địa chỉ, xuống dòng
    '@tiec-noi': (() => { const [ten, ...dia] = lay('Nơi tổ chức tiệc').split('|'); return `<span class="tiec-ten">${nhieuDong(ten)}</span>` + (dia.length ? nhieuDong(dia.join('|')) : ''); })(),
    '@duong-dan-goc': escAttr(goc),
    '@anh-chia-se': escAttr(diaChiDayDu(lay, lay('Ảnh khi chia sẻ'))),
    '@anh-chia-se-kich-thuoc': (() => {
      const f = lay('Ảnh khi chia sẻ');
      const k = f && !laLinkNgoai(f) && kichThuocAnh(f);
      return k ? `<meta property="og:image:width" content="${k.rong}">
<meta property="og:image:height" content="${k.cao}">` : '';
    })(),
    '@dia-chi-website': escAttr(lay('Địa chỉ website').replace(/\/+$/, '') + goc + ben.ben + '/'),
    '@ben': ben.ben,
    '@ten-ben': escHtml(ben.ten),
    '@thu': THU[d.thu],
    '@ngay': p2(d.ngay),
    '@thang': 'THÁNG ' + p2(d.thang),
    '@nam': String(d.nam),
    '@ngay-bia': `${d.ngay} tháng ${d.thang}, ${d.nam}`,
    '@lich-tieu-de': `Tháng ${d.thang} / ${d.nam}`,
    '@lich-cac-ngay': taoLich(d),
    '@link-lich': escAttr(linkThemLich(lay, d, gioTiec)),
    '@ban-do-nhung': escAttr(bd.nhung),
    '@link-chi-duong': escAttr(bd.chiDuong),
    '@mau-trang-phuc': taoMauTrangPhuc(muc),
    '@lich-trinh': taoLichTrinh(muc, lay),
    '@cau-hinh-js': JSON.stringify(cauHinh).replace(/</g, '\\u003c'),
    ...album,
  };
  for (const [nhan, ten] of Object.entries(AN_HIEN)) tinhSan['@an-' + ten] = laKhong(lay(nhan)) ? ' hidden' : '';
  tinhSan['@an-don-khach'] = lay('Giờ đón khách') ? '' : ' hidden';
  if (!album.soAnh) tinhSan['@an-album'] = ' hidden';
  if (!nhac) console.warn('ℹ️  Không có "Nhạc nền": thiệp không phát nhạc.');

  const thiep = dien(fs.readFileSync(path.join(GOC, 'src/thiep.html'), 'utf8'), laKhong(lay('Cô dâu đứng trước (có/không)')) ? lay : doiCho(lay), tinhSan);
  const taoLink = dien(fs.readFileSync(path.join(GOC, 'src/tao-link.html'), 'utf8'), lay, tinhSan);
  const thongKe = dien(fs.readFileSync(path.join(GOC, 'src/thong-ke.html'), 'utf8'), lay, tinhSan);
  if (thieu.size) {
    throw new LoiNoiDung('noi-dung.md thiếu các mục sau (có thể bạn đã lỡ sửa/xoá tên mục):\n   - ' + [...thieu].join('\n   - '));
  }
  return { thiep, taoLink, thongKe, goc };
}

function build() {
  const batDau = Date.now();
  const muc = docNoiDung();
  const trang = CAC_BEN.map((ben) => ({ ...ben, ...taoTrang(mucTheoBen(muc, ben), ben) }));
  const { goc } = trang[0];

  fs.rmSync(RA, { recursive: true, force: true });
  fs.mkdirSync(RA, { recursive: true });
  for (const thuMuc of ['css', 'js', 'fonts']) fs.cpSync(path.join(GOC, 'src', thuMuc), path.join(RA, thuMuc), { recursive: true });
  for (const thuMuc of ['anh', 'nhac']) fs.cpSync(path.join(GOC, thuMuc), path.join(RA, thuMuc), { recursive: true });

  for (const t of trang) {
    fs.mkdirSync(path.join(RA, t.ben, 'tao-link'), { recursive: true });
    fs.writeFileSync(path.join(RA, t.ben, 'index.html'), t.thiep);
    fs.writeFileSync(path.join(RA, t.ben, 'tao-link', 'index.html'), t.taoLink);
  }
  // Thống kê xác nhận tham dự: mỗi bên một trang (/nha-trai/thong-ke/, /nha-gai/thong-ke/); /thong-ke/ chỉ để chọn bên
  for (const t of trang) {
    fs.mkdirSync(path.join(RA, t.ben, 'thong-ke'));
    fs.writeFileSync(path.join(RA, t.ben, 'thong-ke', 'index.html'), t.thongKe);
  }
  fs.mkdirSync(path.join(RA, 'thong-ke'));
  fs.writeFileSync(path.join(RA, 'thong-ke', 'index.html'), `<!DOCTYPE html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>Thống kê xác nhận tham dự</title>
<style>body{margin:0;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;font-family:system-ui,sans-serif;background:linear-gradient(160deg,#fbf6f0,#efe2d6);color:#3b2a2c}a{display:block;width:240px;text-align:center;padding:14px;border-radius:14px;background:#511419;color:#fff;font-weight:700;text-decoration:none}</style></head>
<body><h1 style="font-weight:600;font-size:22px;margin:0 0 6px">Thống kê xác nhận tham dự</h1>${trang.map((t) => `<a href="${goc}${t.ben}/thong-ke/">${escHtml(t.ten)}</a>`).join('')}</body></html>
`);
  // Trang chủ hiện thiệp nhà trai. Đường dẫn không có file (link ngắn, /nha-gai/<lạ>, link cũ không có /nha-trai/)
  // do Cloudflare Worker (worker/index.mjs) xử lý.
  fs.writeFileSync(path.join(RA, 'index.html'), trang[0].thiep);
  // /tao-link/ cũ chuyển sang trang tạo link nhà trai
  const sangTaoLink = `${goc}${trang[0].ben}/tao-link/`;
  fs.mkdirSync(path.join(RA, 'tao-link'));
  fs.writeFileSync(path.join(RA, 'tao-link', 'index.html'), `<!DOCTYPE html><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=${sangTaoLink}"><script>location.replace(${JSON.stringify(sangTaoLink)})</script>\n`);
  fs.writeFileSync(path.join(RA, '_redirects'), `/tao-link  ${sangTaoLink}  301\n`);

  console.log(`✅ Đã tạo website/ (${Date.now() - batDau} ms)`);
}

/* ------------------------------------------------------------------ máy chủ xem thử */
const KIEU = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.gif': 'image/gif', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4',
  '.ttf': 'font/ttf', '.otf': 'font/otf', '.woff': 'font/woff', '.woff2': 'font/woff2',
};

// Link ngắn + xác nhận tham dự khi xem thử trên máy: giống worker/index.mjs trên Cloudflare nhưng lưu vào file thay cho Cloudflare KV
function khoFile(file) {
  const doc = () => { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { return {}; } };
  const ghi = (tatCa) => fs.writeFileSync(file, JSON.stringify(tatCa, null, 2));
  return {
    get: async (khoa) => doc()[khoa] || null,
    set: async (khoa, giaTri) => { const tatCa = doc(); tatCa[khoa] = giaTri; ghi(tatCa); },
    xoa: async (khoa) => { const tatCa = doc(); delete tatCa[khoa]; ghi(tatCa); },
    list: async (tienTo) => Object.entries(doc()).filter(([k]) => k.startsWith(tienTo)).map(([khoa, v]) => ({ khoa, ...v })),
  };
}
const khoLienKet = khoFile(path.join(GOC, 'lien-ket.local.json'));
const khoXacNhan = khoFile(path.join(GOC, 'xac-nhan.local.json'));
let lienKet = null; // module chung/lien-ket.mjs (ESM) nạp khi máy chủ khởi động
let xacNhan = null; // module chung/xac-nhan.mjs
const traJson = (res, trangThai, duLieu) => {
  res.writeHead(trangThai, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(duLieu));
};

async function xuLyLinkNgan(req, res, p) {
  const api = {
    '/api/tao-link': (body) => lienKet.taoLinkMoi(khoLienKet, body, process.env.MAT_KHAU_TAO_LINK),
    '/api/xac-nhan': (body) => xacNhan.luuXacNhan(khoXacNhan, body),
    // Trên máy: không đặt MAT_KHAU_THONG_KE thì xem không cần mật khẩu
    '/api/thong-ke': (body) => xacNhan.thongKe(khoXacNhan, body, xacNhan.layMatKhau(process.env, xacNhan.benThongKe(body) || 'x'), false),
  }[p];
  if (api) {
    if (req.method !== 'POST') return traJson(res, 405, { loi: 'Chỉ nhận POST.' }), true;
    const phan = [];
    for await (const chunk of req) phan.push(chunk);
    const raw = Buffer.concat(phan).toString('utf8');
    let body = {};
    try { body = JSON.parse(raw || '{}'); } catch (e) { return traJson(res, 400, { loi: 'Dữ liệu không hợp lệ.' }), true; }
    const kq = await api(body);
    traJson(res, kq.trangThai, kq.duLieu);
    return true;
  }
  const duongDan = lienKet.layDuongDan(p);
  const duLieu = duongDan && !fs.existsSync(path.join(RA, duongDan)) && (await khoLienKet.get(duongDan));
  if (!duLieu) return false;
  const html = lienKet.chenThongTin(fs.readFileSync(path.join(RA, lienKet.benCuaLink(duongDan), 'index.html'), 'utf8'), duLieu);
  res.writeHead(200, { 'Content-Type': KIEU['.html'], 'Cache-Control': 'no-store' });
  res.end(html);
  return true;
}

function moMayChu(cong) {
  http.createServer(async (req, res) => {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    try {
      if (await xuLyLinkNgan(req, res, p)) return;
    } catch (e) {
      console.error('❌ Link ngắn: ' + e.message);
      return traJson(res, 500, { loi: e.message });
    }
    let file = path.join(RA, path.normalize(p).replace(/^(\.\.[\\/])+/, ''));
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    if (!file.startsWith(RA) || !fs.existsSync(file)) { // link tuỳ ý -> thiệp (của bên đó nếu nằm trong /nha-trai/, /nha-gai/)
      const ben = lienKet.CAC_BEN.find((b) => p.startsWith(`/${b}/`));
      file = path.join(RA, ben || '', 'index.html');
    }
    const dau = { 'Content-Type': KIEU[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store', 'Accept-Ranges': 'bytes' };
    const tong = fs.statSync(file).size;
    // Trình duyệt (nhất là Safari/iPhone) xin nhạc/video theo từng đoạn bằng "Range"
    const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '');
    if (range && (range[1] || range[2])) {
      let bd = range[1] ? Number(range[1]) : Math.max(0, tong - Number(range[2]));
      let kt = range[1] && range[2] ? Math.min(Number(range[2]), tong - 1) : tong - 1;
      if (bd > kt || bd >= tong) { res.writeHead(416, { 'Content-Range': `bytes */${tong}` }); return res.end(); }
      res.writeHead(206, { ...dau, 'Content-Range': `bytes ${bd}-${kt}/${tong}`, 'Content-Length': kt - bd + 1 });
      return fs.createReadStream(file, { start: bd, end: kt }).pipe(res);
    }
    res.writeHead(200, { ...dau, 'Content-Length': tong });
    fs.createReadStream(file).pipe(res);
  }).listen(cong, () => {
    console.log(`\n🌐 Thiệp nhà trai: http://localhost:${cong}/nha-trai/   tạo link: http://localhost:${cong}/nha-trai/tao-link/`);
    console.log(`🌐 Thiệp nhà gái:  http://localhost:${cong}/nha-gai/    tạo link: http://localhost:${cong}/nha-gai/tao-link/`);
    console.log(`📊 Thống kê xác nhận tham dự: http://localhost:${cong}/nha-trai/thong-ke/   http://localhost:${cong}/nha-gai/thong-ke/`);
    console.log('   (Sửa noi-dung.md / ảnh rồi tải lại trang. Ctrl+C để dừng.)\n');
  });
}

function theoDoi() {
  let hen = null;
  const chay = () => {
    clearTimeout(hen);
    hen = setTimeout(() => {
      try { build(); } catch (e) { console.error('❌ ' + e.message); }
    }, 300);
  };
  for (const p of ['noi-dung.md', 'src', 'anh', 'nhac']) {
    fs.watch(path.join(GOC, p), { recursive: true }, chay);
  }
}

try {
  build();
} catch (e) {
  console.error('❌ ' + e.message);
  if (!(e instanceof LoiNoiDung)) console.error(e.stack);
  if (!process.argv.includes('--serve')) process.exit(1);
}
if (process.argv.includes('--serve')) {
  const nap = (f) => import(require('url').pathToFileURL(path.join(GOC, f)).href);
  Promise.all([nap('chung/lien-ket.mjs'), nap('chung/xac-nhan.mjs')]).then(([m, x]) => {
    lienKet = m;
    xacNhan = x;
    moMayChu(Number(process.env.PORT) || 8080);
    theoDoi();
  });
}

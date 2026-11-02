/**
 * Nhận "Xác nhận tham dự" và "Sổ lưu bút" từ thiệp cưới, ghi vào Google Sheet (mỗi loại một trang tính).
 * Cách cài: xem google-sheet/HUONG-DAN.md
 */
const TRANG = {
  'xac-nhan': {
    ten: 'Xác nhận tham dự',
    cot: ['Thời gian', 'Họ tên', 'Tham dự', 'Số người', 'Khách mời (từ link)', 'Link đã mở'],
    dong: (p) => [p.ho_ten, p.tham_du, p.so_nguoi, p.khach_moi, p.link],
  },
  'loi-chuc': {
    ten: 'Lời chúc',
    cot: ['Thời gian', 'Họ tên', 'Lời chúc', 'Khách mời (từ link)', 'Link đã mở'],
    dong: (p) => [p.ho_ten, p.loi_chuc, p.khach_moi, p.link],
  },
};

function doPost(e) {
  const khoa = LockService.getScriptLock();
  khoa.waitLock(10000);
  try {
    const p = e.parameter;
    const loai = TRANG[p.loai] || TRANG['loi-chuc'];
    const bang = SpreadsheetApp.getActiveSpreadsheet();
    const trang = bang.getSheetByName(loai.ten) || bang.insertSheet(loai.ten);
    if (trang.getLastRow() === 0) {
      trang.appendRow(loai.cot);
      trang.getRange(1, 1, 1, loai.cot.length).setFontWeight('bold');
      trang.setFrozenRows(1);
    }
    trang.appendRow([new Date()].concat(loai.dong(p).map(an)));
    return ContentService.createTextOutput('ok');
  } finally {
    khoa.releaseLock();
  }
}

// Chặn khách nhập công thức (=, +, -, @) vào bảng tính
function an(giaTri) {
  const s = String(giaTri || '').slice(0, 2000);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

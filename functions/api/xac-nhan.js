/*
 * POST /api/xac-nhan  { ben, ten, thamDu: "co"|"khong", soNguoi, khachMoi, duongDan }  -> { ok }
 * Khách bấm "Gửi xác nhận" trên thiệp. Xem kết quả ở trang /thong-ke/.
 */
import { luuXacNhan } from '../../chung/xac-nhan.mjs';
import { layKho } from '../../chung/kho-cloudflare.mjs';

const json = (trangThai, duLieu) => new Response(JSON.stringify(duLieu), {
  status: trangThai,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
});

export async function onRequest({ request, env }) {
  if (request.method !== 'POST') return json(405, { loi: 'Chỉ nhận POST.' });
  const kho = layKho(env);
  if (!kho) return json(500, { loi: 'Chưa gắn KV namespace "LIEN_KET" cho dự án Cloudflare Pages.' });
  let body = {};
  try { body = await request.json(); } catch (e) { return json(400, { loi: 'Dữ liệu không hợp lệ.' }); }
  const kq = await luuXacNhan(kho, body);
  return json(kq.trangThai, kq.duLieu);
}

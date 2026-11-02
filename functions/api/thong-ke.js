/*
 * POST /api/thong-ke  { ben, matKhau, xoa? }  -> { danhSach }   (trang /nha-trai/thong-ke/, /nha-gai/thong-ke/ gọi)
 * Mật khẩu: MAT_KHAU_THONG_KE_NHA_TRAI / MAT_KHAU_THONG_KE_NHA_GAI, không có thì MAT_KHAU_THONG_KE, rồi MAT_KHAU_TAO_LINK.
 * Chưa có mật khẩu nào thì không cho xem.
 */
import { thongKe, benThongKe, layMatKhau } from '../../chung/xac-nhan.mjs';
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
  const kq = await thongKe(kho, body, layMatKhau(env, benThongKe(body) || 'x'), true);
  return json(kq.trangThai, kq.duLieu);
}

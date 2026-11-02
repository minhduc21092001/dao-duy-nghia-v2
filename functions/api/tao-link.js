/*
 * POST /api/tao-link  { nguoiNhan, ben, matKhau? }  -> { duongDan }
 * Đặt biến môi trường MAT_KHAU_TAO_LINK (Settings → Variables and Secrets) nếu muốn chỉ người biết mật khẩu mới tạo được link.
 */
import { taoLinkMoi } from '../../chung/lien-ket.mjs';
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
  const kq = await taoLinkMoi(kho, body, env.MAT_KHAU_TAO_LINK);
  return json(kq.trangThai, kq.duLieu);
}

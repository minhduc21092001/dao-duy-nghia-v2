/*
 * Cloudflare Pages Function: link ngắn cho từng khách.
 *   GET /nha-trai/<ten>, /nha-gai/<ten> (và /<ten> của link cũ) -> thiệp của bên đó, có tiêu đề xem trước + tên khách riêng
 *   GET /nha-gai/<link lạ>                                     -> thiệp nhà gái bình thường (tương tự nhà trai)
 * Còn lại (trang chủ, /nha-gai/, trang tạo link…) để Cloudflare trả file tĩnh như thường.
 * Ảnh, css, js, nhạc không đi qua đây (xem website/_routes.json do build.js tạo).
 */
import { CAC_BEN, chenThongTin, layDuongDan, benCuaLink } from '../chung/lien-ket.mjs';
import { layKho } from '../chung/kho-cloudflare.mjs';

export async function onRequest({ request, env, next }) {
  if (request.method !== 'GET' && request.method !== 'HEAD') return next();
  const url = new URL(request.url);
  const duongDan = layDuongDan(url.pathname);
  if (!duongDan) return next();

  const kho = layKho(env);
  const duLieu = kho ? await kho.get(duongDan) : null;
  const ben = benCuaLink(duongDan);
  // Link cũ không có /nha-trai/ mà chưa tạo ở trang tạo link: Cloudflare tự hiện trang chủ (thiệp nhà trai)
  if (!duLieu && !CAC_BEN.some((b) => duongDan.startsWith(b + '/'))) return next();

  const res = await env.ASSETS.fetch(new URL(`/${ben}/`, url));
  if (!duLieu || !(res.headers.get('content-type') || '').includes('text/html')) return res;
  const headers = new Headers(res.headers);
  headers.delete('content-length');
  headers.delete('etag');
  headers.set('cache-control', 'public, max-age=0, must-revalidate');
  return new Response(chenThongTin(await res.text(), duLieu), { status: 200, headers });
}

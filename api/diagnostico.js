// Vercel Serverless Function · recibe el autodiagnóstico y lo envía por correo con Resend.
// Variables de entorno (Vercel → Settings → Environment Variables):
//   RESEND_API_KEY  (obligatoria)  → tu API key de Resend
//   TO_EMAIL        (opcional)     → dónde recibes los diagnósticos (por defecto vortexweb.colombia@gmail.com)
//   FROM_EMAIL      (opcional)     → remitente, p. ej. "Vortex Web <hola@tudominio.co>" (por defecto onboarding@resend.dev)
const esc = t => String(t == null ? '' : t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ROWS = [['nombre', 'Nombre'], ['wa', 'WhatsApp'], ['mail', 'Correo'], ['puntaje', 'Puntaje'], ['plan_recomendado', 'Plan recomendado'],
  ['sector', 'Tipo de negocio'], ['web', '¿Tiene web?'], ['canales', 'Cómo lo encuentran'], ['reservas', 'Cómo reservan hoy'], ['objetivo', 'Objetivo'], ['inicio', 'Cuándo quiere su web']];

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ ok: false });
  let d = req.body;
  if (typeof d === 'string') { try { d = JSON.parse(d); } catch (e) { d = {}; } }
  d = d || {};
  if (d['bot-field']) return res.status(200).json({ ok: true });            // trampa anti-spam
  const mail = String(d.mail || '').trim(), nombre = String(d.nombre || '').trim(), wa = String(d.wa || '').trim();
  if (!nombre || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail) || wa.replace(/\D/g, '').length < 7)
    return res.status(400).json({ ok: false, error: 'datos inválidos' });
  if (!process.env.RESEND_API_KEY) return res.status(500).json({ ok: false, error: 'falta RESEND_API_KEY' });

  const html = '<div style="font-family:Arial,sans-serif;max-width:560px"><h2 style="margin:0 0 14px">Nuevo diagnóstico · Vortex Web</h2>' +
    '<table style="border-collapse:collapse;width:100%">' +
    ROWS.map(([k, l]) => '<tr><td style="padding:8px 10px;border-bottom:1px solid #e3e8f2;color:#566178;width:42%">' + l + '</td><td style="padding:8px 10px;border-bottom:1px solid #e3e8f2"><b>' + esc(d[k]) + '</b></td></tr>').join('') +
    '</table><p style="margin-top:16px"><a href="https://wa.me/' + esc(wa.replace(/\D/g, '')) + '">Escribir por WhatsApp</a></p></div>';

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + process.env.RESEND_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.FROM_EMAIL || 'Vortex Web <onboarding@resend.dev>',
        to: [process.env.TO_EMAIL || 'vortexweb.colombia@gmail.com'],
        reply_to: mail,
        subject: 'Nuevo diagnóstico · ' + nombre + ' · ' + (d.plan_recomendado || ''),
        html
      })
    });
    if (!r.ok) return res.status(502).json({ ok: false });
    return res.status(200).json({ ok: true });
  } catch (e) { return res.status(502).json({ ok: false }); }
};

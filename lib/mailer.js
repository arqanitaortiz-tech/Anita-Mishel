/* ============================================================
   Envío de correos vía Zoho (SMTP) — solo servidor.
   Credenciales en variables de entorno de Vercel:
     ZOHO_USER  -> info@anitamishel.com
     ZOHO_PASS  -> clave de aplicación de Zoho (NO la clave normal)
   Si no están definidas, los envíos se omiten sin romper nada.
   ============================================================ */
import nodemailer from 'nodemailer';

const USER = process.env.ZOHO_USER;
const PASS = process.env.ZOHO_PASS;

export function correoConfigurado() {
  return Boolean(USER && PASS);
}

function transporte() {
  return nodemailer.createTransport({
    host: 'smtppro.zoho.com',
    port: 465,
    secure: true,
    auth: { user: USER, pass: PASS },
  });
}

const pieHtml = `
  <p style="margin-top:28px;font-size:12px;color:#6F7469">
    Arq. Urb. Anita Mishel · Asesoría Académica · Ecuador<br>
    <a href="https://anitamishel.com" style="color:#6B7B5E">anitamishel.com</a> · info@anitamishel.com
  </p>`;

export async function enviarCorreo({ para, asunto, html, adjuntos = [] }) {
  if (!correoConfigurado()) {
    console.warn('Correo omitido (ZOHO_USER/ZOHO_PASS no configurados):', asunto);
    return { omitido: true };
  }
  const t = transporte();
  await t.sendMail({
    from: `"Anita Mishel" <${USER}>`,
    to: para,
    replyTo: USER,
    subject: asunto,
    html: `<div style="font-family:Arial,sans-serif;font-size:14px;color:#141F17;line-height:1.6">${html}${pieHtml}</div>`,
    attachments: adjuntos,
  });
  return { enviado: true };
}

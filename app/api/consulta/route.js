/* ============================================================
   POST /api/consulta — agenda una consulta de un PROSPECTO (público).
   No requiere sesión. Valida disponibilidad, guarda la consulta y
   envía correos (al prospecto y a info@).
   ============================================================ */
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_KEY } from '@/lib/supabase';
import { enviarCorreo, correoConfigurado } from '@/lib/mailer';

export async function POST(request) {
  try {
    const b = await request.json();
    const nombres = (b.nombres || '').trim();
    const correo = (b.correo || '').trim();
    const telefono = (b.telefono || '').trim();
    const ciudad = (b.ciudad || '').trim();
    const universidad = (b.universidad || '').trim();
    const nivel = b.nivel === 'Pregrado' ? 'Pregrado' : 'Posgrado';
    const tema = (b.tema || '').trim();
    const dia = (b.dia || '').trim();        // YYYY-MM-DD
    const hora = Number(b.hora);             // 8..22

    if (!nombres || !correo || !telefono || !ciudad || !universidad || !tema || !dia || !hora)
      return NextResponse.json({ error: 'Faltan datos.' }, { status: 400 });
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(correo))
      return NextResponse.json({ error: 'El correo no es válido.' }, { status: 400 });
    if (hora < 8 || hora >= 23)
      return NextResponse.json({ error: 'Ese horario no está disponible. La atención es de 08:00 a 23:00.' }, { status: 409 });

    const cuando = new Date(`${dia}T${String(hora).padStart(2, '0')}:00:00`);
    if (isNaN(cuando) || cuando < new Date())
      return NextResponse.json({ error: 'Elige una fecha y hora futuras.' }, { status: 400 });

    const sb = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

    // Validar contra bloqueos (lectura pública)
    const { data: bloqs } = await sb.from('bloqueos').select('*').eq('fecha', dia);
    const cerrado = (bloqs || []).some((x) => x.todo_el_dia) ||
      (bloqs || []).some((x) => !x.todo_el_dia && x.hora_inicio && x.hora_fin &&
        hora >= parseInt(x.hora_inicio.slice(0, 2), 10) && hora < parseInt(x.hora_fin.slice(0, 2), 10));
    if (cerrado)
      return NextResponse.json({ error: 'Ese horario no está disponible. Por favor elige otro.' }, { status: 409 });

    const { data: fila, error } = await sb.from('consultas').insert({
      nombres, correo, telefono, ciudad, universidad, nivel, tema,
      fecha: cuando.toISOString(), estado: 'nueva',
    }).select().single();
    if (error) return NextResponse.json({ error: 'No se pudo agendar: ' + error.message }, { status: 500 });

    // Correos
    if (correoConfigurado()) {
      const cuandoTxt = cuando.toLocaleString('es-EC', {
        timeZone: 'America/Guayaquil', weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
      });
      await enviarCorreo({
        para: correo,
        asunto: 'Recibimos tu solicitud de consulta · Anita Mishel',
        html: `<p>Hola <b>${nombres}</b>,</p>
          <p>Recibimos tu solicitud de consulta para el <b>${cuandoTxt}</b>. Nos pondremos en contacto contigo para confirmarla.</p>
          <p>Tema: ${tema}</p>`,
      });
      await enviarCorreo({
        para: process.env.ZOHO_USER,
        asunto: `Nueva consulta · ${nombres}`,
        html: `<p>Nuevo prospecto solicitó una consulta.</p>
          <p><b>${nombres}</b> · ${ciudad}<br>${universidad} · ${nivel}<br>Correo: ${correo} · Tel: ${telefono}<br>
          Fecha: ${cuandoTxt}<br>Tema: ${tema}</p>`,
      });
    }

    return NextResponse.json({ ok: true, id: fila.id });
  } catch (e) {
    console.error('Error /api/consulta:', e);
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 });
  }
}

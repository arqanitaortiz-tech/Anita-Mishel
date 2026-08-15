/* ============================================================
   POST /api/notificar — avisos por correo al cliente.
   Solo la administradora puede llamarlo.
   body: { tipo: 'cita' | 'abono', clienteId, datos: {...} }
   ============================================================ */
import { NextResponse } from 'next/server';
import { sbDesdeRequest, usuarioDe } from '@/lib/supabaseServer';
import { enviarCorreo, correoConfigurado } from '@/lib/mailer';

export async function POST(request) {
  try {
    const { sb, token } = sbDesdeRequest(request);
    if (!sb) return NextResponse.json({ error: 'Sin sesión.' }, { status: 401 });
    const user = await usuarioDe(sb, token);
    if (!user) return NextResponse.json({ error: 'Sesión inválida.' }, { status: 401 });

    const { data: esAdmin } = await sb.rpc('is_admin');
    if (!esAdmin) return NextResponse.json({ error: 'Solo administración.' }, { status: 403 });

    if (!correoConfigurado()) return NextResponse.json({ ok: true, omitido: true });

    const { tipo, clienteId, datos = {} } = await request.json();

    // Correo del cliente (del onboarding)
    const { data: ob } = await sb.from('onboarding')
      .select('correo, nombres').eq('cliente_id', clienteId)
      .order('creado', { ascending: false }).limit(1);
    const destino = ob?.[0]?.correo;
    const nombre = ob?.[0]?.nombres || 'estimado/a cliente';
    if (!destino) return NextResponse.json({ ok: true, omitido: true, motivo: 'cliente sin correo' });

    if (tipo === 'cita') {
      const fecha = new Date(datos.fecha).toLocaleString('es-EC', {
        timeZone: 'America/Guayaquil',
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
      });
      await enviarCorreo({
        para: destino,
        asunto: 'Tu cita fue confirmada · Anita Mishel',
        html: `<p>Hola <b>${nombre}</b>,</p>
          <p>Tu cita fue <b>confirmada</b> para el <b>${fecha}</b>.</p>
          ${datos.nota ? `<p>Nota de tu asesora: ${datos.nota}</p>` : ''}
          <p>Puedes ver el detalle en tu espacio de la plataforma.</p>`,
      });
    } else if (tipo === 'abono') {
      await enviarCorreo({
        para: destino,
        asunto: 'Abono registrado · Anita Mishel',
        html: `<p>Hola <b>${nombre}</b>,</p>
          <p>Registramos un abono de <b>USD $${Number(datos.monto).toFixed(2)}</b> con fecha ${datos.fecha}.</p>
          <p>Total abonado: <b>USD $${Number(datos.totalAbonado).toFixed(2)}</b> de USD $${Number(datos.montoTotal).toFixed(2)}
          · Saldo: <b>USD $${Number(datos.saldo).toFixed(2)}</b>.</p>
          <p>Gracias por tu pago. El detalle completo está en tu espacio de la plataforma.</p>`,
      });
    } else {
      return NextResponse.json({ error: 'Tipo desconocido.' }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('Error /api/notificar:', e);
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 });
  }
}

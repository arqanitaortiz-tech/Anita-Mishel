/* ============================================================
   POST /api/contrato — genera el contrato firmado:
   1. Valida la sesión del cliente.
   2. Guarda el onboarding (datos + PDF cédula ya subidos por el front).
   3. Reserva número de contrato, genera el PDF con ambas firmas.
   4. Archiva el PDF en el almacenamiento privado.
   5. Lo envía por correo al cliente y a info@.
   ============================================================ */
import { NextResponse } from 'next/server';
import { sbDesdeRequest, usuarioDe } from '@/lib/supabaseServer';
import { generarPdfContrato } from '@/lib/pdfContrato';
import { VERSION_PLANTILLA, numeroContrato } from '@/lib/contrato';
import { enviarCorreo, correoConfigurado } from '@/lib/mailer';

export async function POST(request) {
  try {
    const { sb, token } = sbDesdeRequest(request);
    if (!sb) return NextResponse.json({ error: 'Sin sesión.' }, { status: 401 });
    const user = await usuarioDe(sb, token);
    if (!user) return NextResponse.json({ error: 'Sesión inválida.' }, { status: 401 });

    const body = await request.json();
    const { nombres, cedula, universidad, correo, telefono, genero, pdfCedulaPath, firmaB64 } = body;
    if (!nombres || !cedula || !correo || !firmaB64)
      return NextResponse.json({ error: 'Faltan datos.' }, { status: 400 });

    // Cliente del usuario (RLS garantiza que solo ve el suyo)
    const { data: clientes } = await sb.from('clientes').select('*').eq('user_id', user.id).limit(1);
    const cliente = clientes?.[0];
    if (!cliente) return NextResponse.json({ error: 'Perfil no encontrado.' }, { status: 404 });
    if (!cliente.monto_total)
      return NextResponse.json({ error: 'Tu asesora aún no ha registrado el monto del contrato. Contáctala.' }, { status: 400 });

    // Evitar duplicados
    const { data: previo } = await sb.from('contratos').select('id').eq('cliente_id', cliente.id).limit(1);
    if (previo && previo.length)
      return NextResponse.json({ error: 'Ya existe un contrato para este cliente.' }, { status: 400 });

    const fechaFirma = new Date().toISOString();
    const anio = new Date().getFullYear();

    // Reservar número (fila del contrato primero, num autoincremental)
    const { data: fila, error: insErr } = await sb.from('contratos').insert({
      cliente_id: cliente.id,
      anio,
      monto_total: cliente.monto_total,
      anticipo: cliente.anticipo || 0,
      version_plantilla: VERSION_PLANTILLA,
      firmado_en: fechaFirma,
      tipo: 'digital',
    }).select().single();
    if (insErr) return NextResponse.json({ error: 'No se pudo registrar el contrato: ' + insErr.message }, { status: 500 });

    // Generar PDF
    const firmaBytes = Buffer.from(firmaB64.replace(/^data:image\/png;base64,/, ''), 'base64');
    const pdfBytes = await generarPdfContrato({
      numContrato: fila.num,
      anio,
      nombreCliente: nombres,
      cedulaCliente: cedula,
      telefonoCliente: telefono || '',
      genero: genero || 'F',
      montoTotal: Number(cliente.monto_total),
      anticipo: Number(cliente.anticipo || 0),
      fechaFirma,
      firmaClientePngBytes: firmaBytes,
    });

    // Archivar PDF y firma en el almacenamiento privado del cliente
    const numero = numeroContrato(fila.num, anio);
    const pdfPath = `${user.id}/contrato-${numero}.pdf`;
    const firmaPath = `${user.id}/firma-${numero}.png`;
    const up1 = await sb.storage.from('documentos').upload(pdfPath, Buffer.from(pdfBytes), { contentType: 'application/pdf' });
    if (up1.error) return NextResponse.json({ error: 'No se pudo archivar el PDF: ' + up1.error.message }, { status: 500 });
    await sb.storage.from('documentos').upload(firmaPath, firmaBytes, { contentType: 'image/png' });

    await sb.from('contratos').update({ pdf_path: pdfPath, firma_cliente_path: firmaPath }).eq('id', fila.id);

    // Guardar onboarding
    const { error: obErr } = await sb.from('onboarding').insert({
      cliente_id: cliente.id,
      nombres, cedula_ruc: cedula, universidad,
      correo, telefono, genero,
      pdf_cedula_path: pdfCedulaPath || null,
      terminos_aceptados: true,
      fecha_aceptacion: fechaFirma,
    });
    if (obErr) return NextResponse.json({ error: 'Contrato creado pero falló el registro de datos: ' + obErr.message }, { status: 500 });

    // Enviar por correo (cliente + copia a info@)
    let correoEnviado = false;
    if (correoConfigurado()) {
      const adjunto = { filename: `Contrato-${numero}-AnitaMishel.pdf`, content: Buffer.from(pdfBytes) };
      await enviarCorreo({
        para: correo,
        asunto: `Tu contrato de asesoría académica · ${numero}`,
        html: `<p>Hola <b>${nombres}</b>,</p>
          <p>¡Bienvenido/a! Adjunto encontrarás tu contrato de asesoría académica <b>No. ${numero}</b>, firmado electrónicamente por ambas partes.</p>
          <p>Desde tu espacio en la plataforma podrás seguir el avance de tu tesis, tus pagos y tus citas.</p>`,
        adjuntos: [adjunto],
      });
      await enviarCorreo({
        para: process.env.ZOHO_USER,
        asunto: `Contrato firmado · ${numero} · ${nombres}`,
        html: `<p>Se firmó el contrato <b>${numero}</b>.</p>
          <p>Cliente: <b>${nombres}</b> · C.I. ${cedula}<br>Correo: ${correo} · Tel: ${telefono || '—'}<br>
          Monto: USD $${Number(cliente.monto_total).toFixed(2)} · Anticipo: USD $${Number(cliente.anticipo || 0).toFixed(2)}</p>`,
        adjuntos: [adjunto],
      });
      correoEnviado = true;
    }

    return NextResponse.json({ ok: true, numero, correoEnviado });
  } catch (e) {
    console.error('Error /api/contrato:', e);
    return NextResponse.json({ error: 'Error interno al generar el contrato.' }, { status: 500 });
  }
}

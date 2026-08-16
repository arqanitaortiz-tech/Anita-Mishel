/* ============================================================
   Generación del PDF del contrato (solo servidor) con pdf-lib.
   ============================================================ */
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { clausulas, DATOS_CONTRATISTA, numeroContrato } from './contrato';
import { FIRMA_ANITA_B64 } from './firmaAnita';

const A4 = [595.28, 841.89];
const MARGEN = 62;
const ANCHO = A4[0] - MARGEN * 2;

function envolver(texto, font, size) {
  const lineas = [];
  for (const parrafo of texto.split('\n')) {
    if (parrafo.trim() === '') { lineas.push(''); continue; }
    const palabras = parrafo.split(/\s+/);
    let linea = '';
    for (const p of palabras) {
      const prueba = linea ? linea + ' ' + p : p;
      if (font.widthOfTextAtSize(prueba, size) > ANCHO && linea) {
        lineas.push(linea);
        linea = p;
      } else linea = prueba;
    }
    if (linea) lineas.push(linea);
  }
  return lineas;
}

export async function generarPdfContrato(d) {
  // d: numContrato(int), anio, nombreCliente, cedulaCliente, telefonoCliente,
  //    genero, montoTotal, anticipo, fechaFirma, firmaClientePngBytes(Uint8Array)
  const doc = await PDFDocument.create();
  const times = await doc.embedFont(StandardFonts.TimesRoman);
  const timesB = await doc.embedFont(StandardFonts.TimesRomanBold);

  const SIZE = 10.5, LH = 14;
  let page = doc.addPage(A4);
  let y = A4[1] - MARGEN;
  let numPag = 1;

  const pie = (pg, n) => {
    pg.drawText(String(n), { x: MARGEN, y: 34, size: 9, font: times, color: rgb(0.2, 0.2, 0.2) });
  };

  const nuevaPagina = () => {
    pie(page, numPag);
    page = doc.addPage(A4);
    numPag++;
    y = A4[1] - MARGEN;
  };

  const asegurar = (alto) => { if (y - alto < MARGEN + 20) nuevaPagina(); };

  const escribir = (texto, font, size, opts = {}) => {
    const lineas = envolver(texto, font, size);
    for (const l of lineas) {
      asegurar(LH);
      if (l !== '') {
        const x = opts.centrar ? MARGEN + (ANCHO - font.widthOfTextAtSize(l, size)) / 2 : MARGEN;
        page.drawText(l, { x, y, size, font, color: rgb(0.08, 0.08, 0.08) });
      }
      y -= LH;
    }
  };

  // Encabezado
  const numero = numeroContrato(d.numContrato, d.anio);
  escribir(`No. ${numero}`, timesB, 10.5, { centrar: true });
  y -= 4;
  escribir('CONTRATO CIVIL DE PRESTACIÓN DE SERVICIOS DE ASESORÍA ACADÉMICA', timesB, 12.5, { centrar: true });
  y -= 10;

  // Cláusulas
  for (const [titulo, cuerpo] of clausulas(d)) {
    asegurar(LH * 3);
    escribir(titulo + ' - ' + cuerpo, times, SIZE);
    y -= 6;
  }

  // Firmas
  asegurar(170);
  y -= 24;

  const colIzq = MARGEN + 20;
  const colDer = A4[0] / 2 + 30;
  const anchoFirma = 150;

  // Firma Anita
  const firmaAnita = await doc.embedPng(Buffer.from(FIRMA_ANITA_B64, 'base64'));
  const fa = firmaAnita.scale(anchoFirma / firmaAnita.width);
  page.drawImage(firmaAnita, { x: colIzq, y: y - fa.height + 40, width: fa.width, height: fa.height });

  // Firma cliente (dibujada)
  if (d.firmaClientePngBytes) {
    const firmaCli = await doc.embedPng(d.firmaClientePngBytes);
    const fc = firmaCli.scale(Math.min(anchoFirma / firmaCli.width, 70 / firmaCli.height));
    page.drawImage(firmaCli, { x: colDer, y: y - fc.height + 40, width: fc.width, height: fc.height });
  }

  y -= 46;
  const linea = '________________________________';
  page.drawText(linea, { x: colIzq, y, size: 10, font: times });
  page.drawText(linea, { x: colDer, y, size: 10, font: times });
  y -= LH + 2;

  const bloque = (x, titulo, nombre, ci) => {
    page.drawText(titulo, { x, y, size: 10, font: timesB });
    page.drawText(nombre, { x, y: y - LH, size: 10, font: times });
    page.drawText('C.I. ' + ci, { x, y: y - LH * 2, size: 10, font: times });
  };
  bloque(colIzq, 'LA CONTRATISTA', DATOS_CONTRATISTA.nombre, DATOS_CONTRATISTA.cedula);
  bloque(colDer, d.genero === 'M' ? 'EL CONTRATANTE' : 'LA CONTRATANTE', d.nombreCliente.toUpperCase(), d.cedulaCliente);

  y -= LH * 3 + 10;
  asegurar(LH * 2);
  page.drawText(`Aceptado electrónicamente el ${new Date(d.fechaFirma).toLocaleString('es-EC', { timeZone: 'America/Guayaquil' })} (hora de Ecuador) a través de la plataforma anitamishel.com`, {
    x: MARGEN, y, size: 8.5, font: times, color: rgb(0.35, 0.35, 0.35),
  });

  pie(page, numPag);
  return await doc.save();
}

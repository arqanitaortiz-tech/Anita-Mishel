/* ============================================================
   CONTRATO — plantilla, monto en letras y texto de cláusulas.
   VERSION_PLANTILLA se guarda con cada contrato firmado; si el
   abogado cambia el texto, se sube la versión y los contratos
   anteriores conservan la suya.
   ============================================================ */

export const VERSION_PLANTILLA = 1;

export const DATOS_CONTRATISTA = {
  nombre: 'ANA MISHEL ORTIZ VALVERDE',
  cedula: '1720773686',
  ciudad: 'Puyo',
  jurisdiccion: 'los jueces competentes del cantón Puyo, provincia de Pastaza',
};

export const CUENTA_PAGO = [
  'Ortiz Miles Washington Fernando',
  'Banco Guayaquil',
  'Ahorro # 0040940019',
  'info@anitamishel.com',
  'CI: 1709068728',
];

/* ---------- número a letras (español, hasta millones) ---------- */
const U = ['', 'UNO', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE',
  'DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISÉIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE',
  'VEINTE', 'VEINTIUNO', 'VEINTIDÓS', 'VEINTITRÉS', 'VEINTICUATRO', 'VEINTICINCO', 'VEINTISÉIS', 'VEINTISIETE', 'VEINTIOCHO', 'VEINTINUEVE'];
const D = ['', '', '', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
const C = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];

function tresCifras(n) {
  if (n === 0) return '';
  if (n === 100) return 'CIEN';
  const c = Math.floor(n / 100), r = n % 100;
  let s = C[c];
  if (r > 0) {
    if (s) s += ' ';
    if (r < 30) s += U[r];
    else {
      s += D[Math.floor(r / 10)];
      if (r % 10) s += ' Y ' + U[r % 10];
    }
  }
  return s;
}

export function montoEnLetras(monto) {
  const entero = Math.floor(monto);
  const centavos = Math.round((monto - entero) * 100);
  let letras;
  if (entero === 0) letras = 'CERO';
  else if (entero < 1000) letras = tresCifras(entero);
  else if (entero < 1000000) {
    const miles = Math.floor(entero / 1000), resto = entero % 1000;
    letras = (miles === 1 ? 'MIL' : tresCifras(miles) + ' MIL') + (resto ? ' ' + tresCifras(resto) : '');
  } else {
    const mill = Math.floor(entero / 1000000), resto = entero % 1000000;
    letras = (mill === 1 ? 'UN MILLÓN' : tresCifras(mill) + ' MILLONES');
    if (resto) {
      const miles = Math.floor(resto / 1000), r2 = resto % 1000;
      if (miles) letras += ' ' + (miles === 1 ? 'MIL' : tresCifras(miles) + ' MIL');
      if (r2) letras += ' ' + tresCifras(r2);
    }
  }
  const cent = String(centavos).padStart(2, '0');
  return `${letras} ${cent}/100 DÓLARES DE LOS ESTADOS UNIDOS DE AMÉRICA (USD $${entero.toFixed(0)},${cent})`;
}

export function fmtUSD(n) {
  return 'USD $' + Number(n).toFixed(2).replace('.', ',');
}

function fechaEnLetras(fechaISO) {
  const d = new Date(fechaISO);
  const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  return `a los ${d.getDate()} días del mes de ${meses[d.getMonth()]} del ${d.getFullYear()}`;
}

export function numeroContrato(num, anio) {
  return `A-${anio}-${String(num).padStart(3, '0')}`;
}

/* ---------- texto completo del contrato ---------- */
export function clausulas(d) {
  // d: { nombreCliente, cedulaCliente, telefonoCliente, genero ('F'|'M'),
  //      montoTotal, anticipo, fechaFirma }
  const fem = d.genero !== 'M';
  const CONTRATANTE = fem ? 'LA CONTRATANTE' : 'EL CONTRATANTE';
  const portador = fem ? 'portadora' : 'portador';
  const saldo = d.montoTotal - d.anticipo;

  return [
    ['PRIMERA: COMPARECIENTES.',
`Comparecen a la celebración del presente contrato, por una parte, ${DATOS_CONTRATISTA.nombre}, portadora de la cédula de ciudadanía No. ${DATOS_CONTRATISTA.cedula}, de nacionalidad ecuatoriana, a quien en adelante y para efectos de este instrumento se denominará "LA CONTRATISTA"; y, por otra parte, ${d.nombreCliente.toUpperCase()}, ${portador} de la cédula de ciudadanía No. ${d.cedulaCliente}${d.telefonoCliente ? ` (Cel. ${d.telefonoCliente})` : ''}, a quien en adelante se denominará "${CONTRATANTE}". Los comparecientes declaran ser mayores de edad, legalmente capaces para contratar y obligarse, y de manera libre y voluntaria celebran el presente contrato civil de prestación de servicios de asesoría académica, con sujeción al Código Civil ecuatoriano y, en particular, a las disposiciones relativas al arrendamiento de servicios inmateriales, al tenor de las cláusulas siguientes.`],
    ['SEGUNDA: OBJETO.',
`LA CONTRATISTA prestará a favor de ${CONTRATANTE} servicios de asesoría académica especializada para el desarrollo de su trabajo de titulación, brindando acompañamiento durante todas las etapas del proceso, incluyendo la revisión de estructura, metodología, formato, referencias bibliográficas, observaciones emitidas por el tutor y demás instancias académicas, así como orientación para la defensa del trabajo.`],
    ['TERCERA: PLAZO.',
`El presente contrato tendrá vigencia desde la fecha de entrega del anticipo pactado en la cláusula cuarta hasta la culminación del acompañamiento académico contratado. Se estima un tiempo de ejecución referencial de cinco (5) a seis (6) meses, plazo que podrá extenderse cuando ello dependa del cronograma, observaciones o procedimientos establecidos por la universidad, sin que dicha extensión constituya incumplimiento imputable a ninguna de las partes.`],
    ['CUARTA: PRECIO Y FORMA DE PAGO.',
`El valor total de los servicios contratados es de ${montoEnLetras(d.montoTotal)}, que será cancelado de la siguiente manera: ${fmtUSD(d.anticipo)} como anticipo, a la suscripción del presente contrato; y, ${fmtUSD(saldo)} de conformidad al avance entregado por el asesor de tesis correspondiente, que serán en abonos acordados por las partes, una vez cumplidas las obligaciones establecidas en este instrumento. Los pagos podrán realizarse mediante depósito o transferencia a la cuenta señalada por LA CONTRATISTA para el efecto, sin perjuicio de que las partes acuerden por escrito otro medio de pago.

Los pagos se podrán realizar en la siguiente cuenta:

${CUENTA_PAGO.join('\n')}`],
    ['QUINTA: OBLIGACIONES DE LA CONTRATISTA.',
`LA CONTRATISTA se compromete a: a) brindar asesoría durante todo el proceso descrito en la cláusula segunda; b) atender las observaciones emitidas por el tutor y demás instancias académicas; c) realizar las modificaciones necesarias mientras el contrato se encuentre vigente y dentro del alcance del servicio contratado; d) colaborar con la organización de referencias bibliográficas utilizando un gestor bibliográfico (Mendeley, Zotero u otro equivalente); e) apoyar en la elaboración de tablas, gráficos, matrices y presentación de resultados a partir de la información proporcionada por ${CONTRATANTE}; f) mantener comunicación permanente con ${CONTRATANTE}; y, g) guardar absoluta confidencialidad sobre la información recibida y sobre la identidad de ${CONTRATANTE}.`],
    ['SEXTA: BIBLIOGRAFÍA.',
`LA CONTRATISTA organizará e incorporará correctamente las referencias bibliográficas solicitadas por el tutor o exigidas por la universidad, utilizando el formato requerido y un gestor bibliográfico apropiado, sin excluir bibliografía por su nivel de dificultad de acceso, salvo que se trate de fuentes de pago o suscripción no cubiertas por este contrato, caso en el cual las partes acordarán previamente la forma de obtenerlas.`],
    ['SÉPTIMA: SERVICIOS NO INCLUIDOS.',
`No forman parte del objeto de este contrato: estudios de campo, mediciones, cálculos técnicos especializados, elaboración de prototipos, creación de páginas web, toma de muestras, elaboración de planos o bosquejos técnicos, adquisición de material investigativo especial, ni programación informática, salvo que dichas actividades hayan sido expresamente acordadas por las partes e incorporadas a la cláusula segunda de este contrato.`],
    ['OCTAVA: CORRECCIONES.',
`LA CONTRATISTA se compromete a realizar todas las correcciones, modificaciones y ajustes que sean solicitados por el tutor, lectores, validadores, biblioteca o cualquier otra autoridad académica competente, sin limitar el número de correcciones, mientras el contrato permanezca vigente y dichas observaciones correspondan al trabajo objeto de la asesoría. ${CONTRATANTE} se compromete a remitir dichas observaciones con al menos cinco (5) días de anticipación a la fecha límite establecida por la universidad, a fin de que puedan ser atendidas con la calidad requerida.`],
    ['NOVENA: ORIGINALIDAD Y CITACIÓN.',
`LA CONTRATISTA entregará documentos originales y respetará las normas de citación académica vigentes, comprometiéndose a corregir cualquier error de citación o de formato que sea señalado por la universidad.`],
    ['DÉCIMA: COMUNICACIÓN Y HORARIOS DE ATENCIÓN.',
`LA CONTRATISTA prestará el servicio en horarios flexibles, de acuerdo con las necesidades del proceso académico de ${CONTRATANTE} y los cronogramas establecidos por la universidad. Las partes mantendrán comunicación mediante correo electrónico, WhatsApp, llamadas telefónicas, videollamadas u otros medios previamente acordados, procurando atender oportunamente los requerimientos, incluidos aquellos que surjan por cambios, observaciones o entregas urgentes, dentro de plazos razonables acordes al cronograma académico.`],
    ['DÉCIMA PRIMERA: CONFIDENCIALIDAD.',
`Toda la información, documentos y datos proporcionados por ${CONTRATANTE} serán tratados como confidenciales y no podrán divulgarse a terceros sin autorización expresa. Asimismo, LA CONTRATISTA no podrá difundir la identidad de ${CONTRATANTE}, ni antes, durante o después de la realización del trabajo, debiendo mantener en todo momento el secreto profesional.`],
    ['DÉCIMA SEGUNDA: DERECHOS DE AUTOR.',
`El trabajo de titulación es de autoría exclusiva de ${CONTRATANTE}. LA CONTRATISTA presta únicamente servicios de asesoría, revisión y acompañamiento académico, sin que ello genere a su favor derecho de autor alguno sobre el contenido, criterios, planes, diapositivas o demás materiales que integran el trabajo de titulación. En el caso de incumplimiento de las obligaciones económicas por parte de ${CONTRATANTE}, LA CONTRATISTA puede anular la disposición descrita en esta cláusula y reclamar ante autoridad competente derechos de autoría.`],
    ['DÉCIMA TERCERA: CUMPLIMIENTO DEL SERVICIO.',
`LA CONTRATISTA se obliga a cumplir con todas las actividades expresamente acordadas entre las partes y a brindar el acompañamiento académico hasta la finalización del servicio contratado, manteniendo comunicación constante y atendiendo oportunamente las observaciones realizadas durante el proceso.`],
    ['DÉCIMA CUARTA: INCUMPLIMIENTO.',
`En caso de que LA CONTRATISTA incumpla injustificadamente las obligaciones asumidas en este contrato, abandone la prestación del servicio, deje de responder de forma reiterada o se niegue a realizar las actividades pactadas, ${CONTRATANTE} podrá dar por terminado el contrato y solicitar la devolución proporcional de los valores pagados por los servicios no ejecutados. Si el incumplimiento ocurre antes de iniciarse la prestación del servicio, la devolución será del cien por ciento (100%) del anticipo recibido. De igual forma, si cualquiera de las partes incumple las obligaciones pactadas en este contrato, la parte afectada podrá darlo por terminado conforme a la legislación aplicable, sin perjuicio de las acciones legales civiles a que hubiere lugar.`],
    ['DÉCIMA QUINTA: TERMINACIÓN.',
`El presente contrato finalizará cuando LA CONTRATISTA haya cumplido las obligaciones establecidas y concluya el acompañamiento académico acordado, por mutuo acuerdo entre las partes, o por las causales de incumplimiento previstas en la cláusula anterior.`],
    ['DÉCIMA SEXTA: LEGISLACIÓN APLICABLE Y RESOLUCIÓN DE CONTROVERSIAS.',
`El presente contrato se rige por la legislación civil ecuatoriana. En caso de controversia derivada de su interpretación o ejecución, las partes procurarán resolverla en primer lugar mediante diálogo directo o mediación, de conformidad con la Ley de Arbitraje y Mediación; de no alcanzarse un acuerdo, se someterán a ${DATOS_CONTRATISTA.jurisdiccion}.`],
    ['DÉCIMA SÉPTIMA: ACEPTACIÓN.',
`Para constancia y aceptación de lo actuado dentro del presente contrato, las partes suscriben este documento por duplicado y de un mismo tenor, en la ciudad de ${DATOS_CONTRATISTA.ciudad}, ${fechaEnLetras(d.fechaFirma)}.`],
  ];
}

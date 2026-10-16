import fs from "node:fs/promises";
import path from "node:path";
import { Presentation, PresentationFile } from "@oai/artifact-tool";

const ROOT = "C:/Proyectos2025/AS/backendAS";
const BUILD = path.join(ROOT, ".codex-presentation-build");
const OUT = path.join(ROOT, "output/pptx");
const LOGO = path.join(ROOT, "src/img/logoGOM.png");
const FONT = "Aptos";
const C = {
  navy: "#163A59",
  blue: "#00549F",
  lightBlue: "#EAF3FA",
  orange: "#FF740C",
  green: "#198754",
  amber: "#B26A00",
  red: "#B42318",
  ink: "#263746",
  muted: "#536575",
  line: "#DFE6EB",
  pale: "#F4F7F9",
  white: "#FFFFFF",
};

const W = 1280;
const H = 720;
const M = 72;

async function writeBlob(filePath, blob) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, new Uint8Array(await blob.arrayBuffer()));
}

function rect(slide, left, top, width, height, fill, radius = "rounded-none") {
  return slide.shapes.add({
    geometry: radius === "rounded-none" ? "rect" : "roundRect",
    position: { left, top, width, height },
    fill,
    line: { style: "solid", fill: "none", width: 0 },
    ...(radius === "rounded-none" ? {} : { borderRadius: radius }),
  });
}

function text(slide, value, left, top, width, height, style = {}) {
  const box = slide.shapes.add({
    geometry: "textbox",
    position: { left, top, width, height },
    fill: "none",
    line: { style: "solid", fill: "none", width: 0 },
  });
  box.text = value;
  box.text.style = {
    fontFamily: FONT,
    fontSize: 18,
    color: C.ink,
    ...style,
  };
  return box;
}

function line(slide, left, top, width, color = C.line, thickness = 1) {
  return slide.shapes.add({
    geometry: "line",
    position: { left, top, width, height: 0 },
    line: { style: "solid", fill: color, width: thickness },
    fill: "none",
  });
}

function header(slide, section, page) {
  text(slide, "ADP CASINO | SEGURIDAD", M, 28, 300, 20, { fontSize: 12, bold: true, color: C.blue });
  text(slide, section, W - 330, 28, 258, 20, { fontSize: 12, color: C.muted, align: "right" });
  line(slide, M, 58, W - 2 * M);
  text(slide, `16 OCT 2026  |  ${String(page).padStart(2, "0")}`, W - 260, H - 38, 188, 18, { fontSize: 10, color: C.muted, align: "right" });
}

function title(slide, value, subtitle = "") {
  text(slide, value, M, 86, W - 2 * M, 54, { fontSize: 32, bold: true, color: C.blue });
  if (subtitle) text(slide, subtitle, M, 142, W - 2 * M, 32, { fontSize: 16, color: C.muted });
}

function bulletList(slide, items, left, top, width, fontSize = 18, gap = 32) {
  items.forEach((item, i) => {
    text(slide, `-  ${item}`, left, top + i * gap, width, gap + 8, { fontSize, color: C.ink });
  });
}

function metric(slide, label, value, caption, left, top, width, color = C.blue) {
  rect(slide, left, top, width, 112, C.pale, "rounded-lg");
  text(slide, label.toUpperCase(), left + 18, top + 16, width - 36, 18, { fontSize: 11, bold: true, color: C.muted });
  text(slide, value, left + 18, top + 39, width - 36, 34, { fontSize: 28, bold: true, color });
  text(slide, caption, left + 18, top + 78, width - 36, 24, { fontSize: 12, color: C.muted });
}

function twoColRows(slide, rows, left, top, colWidths, rowHeight = 46, headerFill = C.blue) {
  const total = colWidths.reduce((a, b) => a + b, 0);
  rows.forEach((row, r) => {
    const y = top + r * rowHeight;
    let x = left;
    row.forEach((cell, c) => {
      rect(slide, x, y, colWidths[c], rowHeight, r === 0 ? headerFill : (r % 2 ? C.white : C.pale));
      text(slide, cell, x + 10, y + 10, colWidths[c] - 20, rowHeight - 12, { fontSize: r === 0 ? 12 : 13, bold: r === 0, color: r === 0 ? C.white : C.ink });
      x += colWidths[c];
    });
  });
  line(slide, left, top + rows.length * rowHeight, total, C.line, 1);
}

async function main() {
  await fs.mkdir(BUILD, { recursive: true });
  await fs.mkdir(OUT, { recursive: true });
  const logoBytes = await fs.readFile(LOGO);
  const logoBuffer = logoBytes.buffer.slice(logoBytes.byteOffset, logoBytes.byteOffset + logoBytes.byteLength);
  const presentation = Presentation.create({ slideSize: { width: W, height: H } });

  // 1. Cover
  {
    const s = presentation.slides.add();
    s.background.fill = C.white;
    s.images.add({ blob: logoBuffer, contentType: "image/png", alt: "Logo GOM", fit: "contain", position: { left: M, top: 58, width: 116, height: 116 } });
    rect(s, 0, 244, W, 300, C.blue);
    text(s, "Pruebas de seguridad\nADP Casino", M + 56, 294, 740, 110, { fontSize: 42, bold: true, color: C.white });
    text(s, "Resultados en testing y condición objetivo para producción", M + 56, 426, 730, 38, { fontSize: 20, color: C.white });
    rect(s, M + 56, 512, 260, 4, C.orange);
    text(s, "Presentación ejecutiva y técnica | 16 de octubre de 2026", M + 56, 570, 720, 26, { fontSize: 14, color: C.muted });
  }

  // 2. Executive status
  {
    const s = presentation.slides.add(); header(s, "Estado de seguridad", 1); title(s, "Estado actual de seguridad", "La aplicación mejoró materialmente, pero todavía requiere cierre operativo antes de producción.");
    metric(s, "Dependencias backend", "10", "0 críticas | 8 altas | 2 moderadas", M, 210, 250, C.green);
    metric(s, "Dependencias frontend", "0", "vulnerabilidades informadas", M + 274, 210, 250, C.green);
    metric(s, "Pruebas de reglas", "36/36", "suite Node correcta", M + 548, 210, 250, C.green);
    metric(s, "Smoke de seguridad", "5/5", "controles HTTP y rutas", M + 822, 210, 250, C.green);
    rect(s, M, 365, W - 2 * M, 150, C.lightBlue, "rounded-lg");
    text(s, "Lectura ejecutiva", M + 24, 388, 260, 26, { fontSize: 20, bold: true, color: C.navy });
    text(s, "El endurecimiento eliminó las vulnerabilidades críticas reportadas y mantuvo la funcionalidad de Casino, Personas, sesiones, permisos y menú. Los principales bloqueadores restantes son secretos expuestos que deben rotarse, SQL/TLS, auditoría persistente, MFA administrativo y verificación de base.", M + 24, 423, 960, 70, { fontSize: 18, color: C.ink });
  }

  // 3. Testing evidence
  {
    const s = presentation.slides.add(); header(s, "Pruebas realizadas", 2); title(s, "Evidencia de testing", "Controles ejecutados en el repositorio y en el entorno local de validación.");
    const rows = [
      ["Prueba", "Resultado", "Evidencia"],
      ["Suite backend", "36 correctas", "node --test"],
      ["Smoke HTTP", "5 correctas", "headers, CORS, límites, 429, ruta retirada"],
      ["Gate de dependencias", "Correcto", "sin críticas de producción"],
      ["Frontend", "Correcto", "ESLint, build Vite, 0 audit"],
      ["Verificación Casino", "Pendiente de corregir", "esperaba 15 pedidos y encontró 23"],
    ];
    twoColRows(s, rows, M, 200, [260, 220, 666], 54);
    text(s, "Qué demuestran estas pruebas", M, 550, 320, 28, { fontSize: 20, bold: true, color: C.navy });
    bulletList(s, ["La funcionalidad principal responde con controles HTTP reforzados.", "El frontend no publica source maps ni dependencias vulnerables informadas.", "La verificación de base aún necesita una ejecución reproducible contra el ambiente candidato."], M, 588, 1050, 16, 28);
  }

  // 4. Implemented controls
  {
    const s = presentation.slides.add(); header(s, "Controles implementados", 3); title(s, "Qué quedó implementado", "Cambios compatibles con la funcionalidad existente.");
    const left = ["Secretos fuera del código actual", "Docker endurecido y usuario node", "Source maps solo fuera de producción", "CSP, HSTS, no-store y Permissions Policy", "Límites de JSON, formularios y parámetros"];
    const right = ["Rate limit de login por IP", "CORS rechazado con 403 JSON", "Errores homogéneos sin stack al cliente", "Ruta técnica pública retirada", "Cookie HttpOnly, SameSite=Lax y Secure"];
    rect(s, M, 210, 520, 350, C.pale, "rounded-lg"); rect(s, 688, 210, 520, 350, C.pale, "rounded-lg");
    text(s, "Aplicación y datos", M + 24, 236, 400, 28, { fontSize: 21, bold: true, color: C.blue });
    text(s, "HTTP y exposición", 712, 236, 400, 28, { fontSize: 21, bold: true, color: C.blue });
    bulletList(s, left, M + 24, 286, 450, 17, 48);
    bulletList(s, right, 712, 286, 450, 17, 48);
    text(s, "La autorización sigue dependiendo del contexto de sesión, empresa y permisos backend; ocultar botones en React no es una medida de seguridad.", M, 600, W - 2 * M, 40, { fontSize: 16, color: C.muted });
  }

  // 5. OWASP framing
  {
    const s = presentation.slides.add(); header(s, "Marco de referencia", 4); title(s, "Criterio OWASP para la salida", "La preparación objetivo se alinea con OWASP ASVS 5.0 nivel 2 y OWASP API Security Top 10.");
    const rows = [
      ["Área", "Estado en testing", "Condición objetivo"],
      ["Autenticación", "bcrypt moderno con fallback legado", "sin claves recuperables, hash versionado y MFA administrativo"],
      ["Sesiones", "cookie protegida y expiración absoluta", "revocación por eventos, CSRF formal y pruebas concurrentes"],
      ["Autorización", "permisos y contexto multiempresa", "matriz negativa completa y pruebas IDOR"],
      ["API", "CORS, límites, headers y rate limit inicial", "protección por flujo y rate limit distribuido"],
      ["Secretos", "retirados del código actual", "rotación, gestor seguro y evidencia de revocación"],
      ["Logging", "logs técnicos parciales", "auditoría de accesos, permisos y datos sensibles"],
    ];
    twoColRows(s, rows, M, 190, [205, 410, 593], 58);
    text(s, "Principio de aceptación", M, 610, 260, 26, { fontSize: 20, bold: true, color: C.navy });
    text(s, "No basta con que npm audit quede limpio: la aprobación debe combinar código, configuración, infraestructura, evidencia de pruebas y aceptación formal del riesgo residual.", M + 280, 607, 790, 38, { fontSize: 16, color: C.ink });
  }

  // 6. Production blockers
  {
    const s = presentation.slides.add(); header(s, "Preparación productiva", 5); title(s, "Bloqueadores antes de producción", "P0: cierre obligatorio. P1: requerido para una evaluación técnica defendible.");
    rect(s, M, 190, 530, 380, "#FFF4E5", "rounded-lg"); rect(s, 678, 190, 530, 380, "#FDECEC", "rounded-lg");
    text(s, "P0 | Obligatorios", M + 24, 218, 420, 30, { fontSize: 22, bold: true, color: C.amber });
    bulletList(s, ["Rotar API key y credencial SQL publicadas.", "Revocar valores anteriores y revisar uso.", "Crear identidad SQL sin sa y con mínimo privilegio.", "Configurar TLS validado hacia SQL Server.", "Construir y escanear imagen final sin secretos."], M + 24, 270, 450, 16, 54);
    text(s, "P1 | Ethical hacking", 702, 218, 420, 30, { fontSize: 22, bold: true, color: C.red });
    bulletList(s, ["Auditoría persistente de login, permisos y cambios.", "MFA para ADMINFULL y cuentas de emergencia.", "Pruebas de IDOR multiempresa y multi-Casino.", "CSRF formal en todas las mutaciones.", "Rate limit distribuido si existe más de una instancia."], 702, 270, 450, 16, 54);
  }

  // 7. Technical hacking scope
  {
    const s = presentation.slides.add(); header(s, "Alcance de pruebas", 6); title(s, "Alcance de un posible technical hacking", "Pruebas autorizadas, controladas y con evidencia reproducible para el ambiente candidato.");
    const cols = [
      ["Identidad", "enumeración, fuerza bruta, spraying, stuffing, recuperación y sesiones concurrentes"],
      ["IDOR", "EmpCod, GECODEMP, RUT, Casino, pedidos, programas, roles y acciones"],
      ["Negocio", "precios, productos, estados, correlativos, cantidades, carreras y rollback"],
      ["API e infraestructura", "SQLi, XSS, SSRF, payloads, TLS, proxy, privilegios, imagen y dependencias"],
    ];
    cols.forEach((col, i) => {
      const x = M + (i % 2) * 568;
      const y = 210 + Math.floor(i / 2) * 184;
      rect(s, x, y, 520, 144, C.pale, "rounded-lg");
      text(s, col[0], x + 22, y + 20, 450, 26, { fontSize: 20, bold: true, color: C.blue });
      text(s, col[1], x + 22, y + 58, 460, 64, { fontSize: 16, color: C.ink });
    });
    text(s, "El equipo externo debe recibir alcance, cuentas de prueba, ventanas de ejecución, contacto de emergencia y criterios de severidad antes de comenzar.", M, 620, W - 2 * M, 32, { fontSize: 16, color: C.muted });
  }

  // 8. Evidence and exit criteria
  {
    const s = presentation.slides.add(); header(s, "Criterios de aprobación", 7); title(s, "Cómo debería quedar para producción", "La salida se aprueba por evidencia, no solo por ausencia de alertas en npm audit.");
    const rows = [
      ["Evidencia", "Criterio mínimo"],
      ["Secretos", "activos nuevos, anteriores revocados y sin valores publicados"],
      ["Dependencias", "sin críticas o aceptación formal documentada"],
      ["Pruebas backend", "suite completa correcta"],
      ["Base de datos", "verify:casino correcto en ambiente candidato"],
      ["UAT", "aceptación por roles y Casinos representativos"],
      ["Imagen", "escaneo sin críticos, sin secretos y ejecución no privilegiada"],
      ["Pentest", "informe, remediación y re-test de hallazgos altos/críticos"],
    ];
    twoColRows(s, rows, M, 190, [310, 898], 52);
    rect(s, M, 612, W - 2 * M, 54, C.green, "rounded-lg");
    text(s, "Salida sugerida: sin críticos abiertos, altos corregidos o aceptados formalmente, secretos rotados, UAT y recuperación comprobadas, y re-test cerrado.", M + 20, 625, W - 2 * M - 40, 26, { fontSize: 15, bold: true, color: C.white });
  }

  // 9. Roadmap
  {
    const s = presentation.slides.add(); header(s, "Próximos pasos", 8); title(s, "Ruta recomendada hacia aprobación", "Ordena el trabajo por riesgo y deja trazabilidad para el equipo técnico y auditoría.");
    const steps = [
      ["1", "Cerrar P0", "rotación, revocación, SQL mínimo privilegio y TLS"],
      ["2", "Validar ambiente", "verify:casino, build, imagen, configuración y UAT"],
      ["3", "Completar P1", "auditoría, MFA, CSRF, IDOR y rate limit distribuido"],
      ["4", "Technical hacking", "ejecución autorizada, informe, remediación y re-test"],
    ];
    steps.forEach((step, i) => {
      const x = M + i * 284;
      rect(s, x, 235, 246, 220, i < 2 ? C.lightBlue : (i === 2 ? "#FFF4E5" : "#E9F7EF"), "rounded-lg");
      text(s, step[0], x + 20, 260, 42, 42, { fontSize: 30, bold: true, color: i < 2 ? C.blue : (i === 2 ? C.amber : C.green) });
      text(s, step[1], x + 20, 318, 200, 28, { fontSize: 20, bold: true, color: C.navy });
      text(s, step[2], x + 20, 366, 200, 70, { fontSize: 15, color: C.ink });
    });
    text(s, "Mensaje final", M, 535, 220, 28, { fontSize: 20, bold: true, color: C.navy });
    text(s, "El sistema está en una posición de testing fortalecida. La condición productiva exige cerrar los bloqueadores P0, producir evidencia operativa y someter el alcance acordado a una evaluación externa autorizada.", M + 220, 532, 820, 46, { fontSize: 18, color: C.ink });
    text(s, "Fuentes: reportes internos de seguridad ADP Casino, OWASP ASVS 5.0, OWASP API Security Top 10 y OWASP Cheat Sheets.", M, 650, W - 2 * M, 22, { fontSize: 11, color: C.muted });
  }

  for (const [index, slide] of presentation.slides.items.entries()) {
    const png = await presentation.export({ slide, format: "png", scale: 1 });
    await writeBlob(path.join(BUILD, `slide-${String(index + 1).padStart(2, "0")}.png`), png);
  }
  const candidate = path.join(BUILD, "adp-casino-seguridad-testing-produccion-candidate.pptx");
  await (await PresentationFile.exportPptx(presentation)).save(candidate);
  console.log(JSON.stringify({ candidate, slides: presentation.slides.items.length }));
}

main().catch((error) => { console.error(error); process.exitCode = 1; });

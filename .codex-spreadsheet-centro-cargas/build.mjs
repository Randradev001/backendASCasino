import fs from "node:fs/promises";
import { FileBlob, SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const outputDir = "/Users/randradev/Proyect2026/AS/backendASCasino/outputs/centro-cargas-20261111";
const outputPath = `${outputDir}/Plantilla_Centro_de_Cargas_Casino.xlsx`;

const wb = Workbook.create();
const font = "Arial";
const navy = "#00549F";
const orange = "#FF740C";
const paleBlue = "#EAF3F8";
const paleYellow = "#FFF2CC";
const paleRed = "#FCE8E6";
const gray = "#667085";
const lightGray = "#E4E7EC";

function baseSheet(name, title, subtitle, tabColor = navy) {
  const sh = wb.worksheets.add(name);
  sh.showGridLines = false;
  sh.tabColor = tabColor;
  sh.getRange("A2").values = [[title]];
  sh.getRange("A2").format.font = { name: font, size: 14, bold: true, color: "#101828" };
  sh.getRange("A3").values = [[subtitle]];
  sh.getRange("A3").format.font = { name: font, size: 10, italic: true, color: gray };
  sh.getRange("A3").format.wrapText = false;
  return sh;
}

function formatInputSheet(sh, columns, example, tableName, widths) {
  const lastCol = String.fromCharCode(64 + columns.length);
  sh.getRange(`A5:${lastCol}5`).values = [columns];
  sh.getRange(`A6:${lastCol}6`).values = [example];
  const header = sh.getRange(`A5:${lastCol}5`);
  header.format.fill = navy;
  header.format.font = { name: font, size: 10, bold: true, color: "#FFFFFF" };
  header.format.horizontalAlignment = "center";
  header.format.verticalAlignment = "center";
  header.format.wrapText = true;
  header.format.rowHeight = 32;
  sh.getRange(`A6:${lastCol}6`).format.font = { name: font, size: 10, color: "#344054" };
  sh.getRange(`A6:${lastCol}6`).format.fill = paleBlue;
  sh.getRange(`A6:${lastCol}6`).format.verticalAlignment = "center";
  sh.getRange(`A5:${lastCol}6`).format.borders = { preset: "outside", style: "thin", color: lightGray };
  const table = sh.tables.add(`A5:${lastCol}6`, true, tableName);
  table.style = "TableStyleMedium2";
  table.showFilterButton = true;
  for (let i = 0; i < widths.length; i++) sh.getRange(`${String.fromCharCode(65 + i)}:${String.fromCharCode(65 + i)}`).format.columnWidth = widths[i];
  sh.freezePanes.freezeRows(5);
  sh.getRange(`A6:${lastCol}500`).format.font = { name: font, size: 10 };
  sh.getRange(`A6:${lastCol}500`).format.verticalAlignment = "center";
  sh.getRange(`A6:${lastCol}500`).format.rowHeight = 20;
}

const guide = baseSheet("Instrucciones", "Centro de cargas Casino", "Plantilla de ejemplo para solicitar, revisar e importar datos maestros.", orange);
guide.getRange("A5:D5").values = [["Pestaña", "Qué se carga", "Campos clave", "Regla principal"]];
guide.getRange("A6:D10").values = [
  ["Solicitantes", "Solicitante y usuario en un solo registro", "Código, RUT, login y ubicación", "Un solicitante corresponde al mismo usuario"],
  ["Productos", "Productos ofrecidos por cada casino", "Código, tipo, casino y precio", "El producto debe pertenecer al casino indicado"],
  ["Casinos", "Casino y responsable operativo", "Código, nombre y RUT responsable", "El RUT debe existir en Solicitantes"],
  ["Destinos", "Lugares donde se entrega el pedido", "Código y nombre", "No repetir códigos ni nombres"],
  ["Motivos", "Motivos permitidos para solicitar", "Código y nombre", "Usar nombres breves y únicos"]
];
guide.getRange("A5:D5").format.fill = navy;
guide.getRange("A5:D5").format.font = { name: font, size: 10, bold: true, color: "#FFFFFF" };
guide.getRange("A5:D10").format.borders = { preset: "outside", style: "thin", color: lightGray };
guide.getRange("A5:D10").format.verticalAlignment = "center";
guide.getRange("A5:D10").format.wrapText = true;
guide.getRange("A12").values = [["Reglas para completar"]];
guide.getRange("A12").format.font = { name: font, size: 11, bold: true, color: navy };
guide.getRange("A13:B20").values = [
  ["1", "No cambiar los nombres de las pestañas ni de las columnas."],
  ["2", "Mantener una fila por registro. No combinar celdas."],
  ["3", "Los códigos deben ser únicos y conservarse como texto, incluso si contienen ceros iniciales."],
  ["4", "El RUT se informa sin puntos y con el dígito verificador separado."],
  ["5", "No incluir contraseñas. La clave inicial se genera o administra por un proceso seguro."],
  ["6", "Precio debe ser un número mayor o igual a cero, sin símbolo de moneda."],
  ["7", "Los campos amarillos son datos que debe completar quien entrega la información."],
  ["8", "Eliminar o reemplazar las filas de ejemplo antes de la carga definitiva."]
];
guide.getRange("A13:A20").format.font = { name: font, size: 10, bold: true, color: navy };
guide.getRange("B13:B20").format.font = { name: font, size: 10, color: "#344054" };
guide.getRange("B13:B20").format.wrapText = true;
guide.getRange("A22:C22").values = [["Convención", "Uso", "Ejemplo"]];
guide.getRange("A23:C25").values = [
  ["Obligatorio", "Debe venir informado para cargar el registro", "Código de solicitante"],
  ["Opcional", "Puede quedar vacío", "Apellido materno"],
  ["Sí / No", "Escribir únicamente uno de esos valores", "Activo = Sí"]
];
guide.getRange("A22:C22").format.fill = navy;
guide.getRange("A22:C22").format.font = { name: font, size: 10, bold: true, color: "#FFFFFF" };
guide.getRange("A5:D25").format.font.name = font;
guide.getRange("A:A").format.columnWidth = 20;
guide.getRange("B:B").format.columnWidth = 55;
guide.getRange("C:C").format.columnWidth = 35;
guide.getRange("D:D").format.columnWidth = 45;
guide.freezePanes.freezeRows(5);

const applicants = baseSheet("Solicitantes", "Carga de solicitantes y usuarios", "Cada fila crea o actualiza al solicitante y al usuario asociado.");
const applicantCols = ["CodigoSolicitante*", "Rut*", "DV*", "LoginUsuario*", "Nombres*", "ApellidoPaterno*", "ApellidoMaterno", "Email*", "CodigoDivision*", "DescripcionDivision*", "CodigoSubdivision*", "DescripcionSubdivision*", "CodigoCentroCosto*", "DescripcionCentroCosto*", "RolAcceso*", "Activo*"];
const applicantExample = ["SOL0001", "12911839", "5", "JPALMA", "Juan Pablo", "Palma", "", "juan.palma@empresa.cl", "D053", "Administración", "S234", "Servicios generales", "C010201115", "Casino y bienestar", "CAS_USER", "Sí"];
formatInputSheet(applicants, applicantCols, applicantExample, "CargaSolicitantes", [18, 14, 8, 18, 20, 20, 20, 30, 18, 28, 20, 30, 22, 32, 18, 12]);
applicants.getRange("A6:P500").format.fill = paleYellow;
applicants.getRange("B6:B500").setNumberFormat("0");
applicants.getRange("A6:A500").setNumberFormat("@");
applicants.getRange("C6:D500").setNumberFormat("@");
applicants.getRange("I6:I500").setNumberFormat("@");
applicants.getRange("K6:K500").setNumberFormat("@");
applicants.getRange("M6:M500").setNumberFormat("@");
applicants.getRange("P6:P500").dataValidation = { rule: { type: "list", values: ["Sí", "No"] } };

const products = baseSheet("Productos", "Carga de productos", "Defina un código único, su tipo, el casino al que pertenece y el precio vigente.");
const productCols = ["CodigoProducto*", "NombreProducto*", "CodigoTipoProducto*", "DescripcionTipoProducto*", "CodigoCasino*", "NombreCasino*", "Precio*", "Activo*"];
const productExample = ["PROD001", "Galletas + Bebidas", "TP01", "Colaciones", "CAS01", "Casino Aves", 1596, "Sí"];
formatInputSheet(products, productCols, productExample, "CargaProductos", [18, 34, 24, 30, 18, 28, 16, 12]);
products.getRange("A6:H500").format.fill = paleYellow;
products.getRange("A6:A500").setNumberFormat("@");
products.getRange("C6:C500").setNumberFormat("@");
products.getRange("E6:E500").setNumberFormat("@");
products.getRange("G6:G500").setNumberFormat("#,##0");
products.getRange("G6:G500").dataValidation = { rule: { type: "decimal", operator: "greaterThanOrEqual", formula1: 0 } };
products.getRange("H6:H500").dataValidation = { rule: { type: "list", values: ["Sí", "No"] } };

const casinos = baseSheet("Casinos", "Carga de casinos", "El responsable debe ser un usuario y solicitante válido.");
const casinoCols = ["CodigoCasino*", "NombreCasino*", "RutResponsable*", "DVResponsable*", "EmailCasino", "Activo*"];
const casinoExample = ["CAS01", "Casino Aves", "14332241", "6", "casino.aves@empresa.cl", "Sí"];
formatInputSheet(casinos, casinoCols, casinoExample, "CargaCasinos", [18, 30, 20, 18, 32, 12]);
casinos.getRange("A6:F500").format.fill = paleYellow;
casinos.getRange("A6:A500").setNumberFormat("@");
casinos.getRange("C6:C500").setNumberFormat("0");
casinos.getRange("D6:D500").setNumberFormat("@");
casinos.getRange("F6:F500").dataValidation = { rule: { type: "list", values: ["Sí", "No"] } };

const destinations = baseSheet("Destinos", "Carga de destinos", "Lugares habilitados para entregar pedidos.");
const destinationCols = ["CodigoDestino*", "NombreDestino*", "Activo*"];
const destinationExample = ["DEST01", "Comedor Casino Aves", "Sí"];
formatInputSheet(destinations, destinationCols, destinationExample, "CargaDestinos", [20, 45, 12]);
destinations.getRange("A6:C500").format.fill = paleYellow;
destinations.getRange("A6:A500").setNumberFormat("@");
destinations.getRange("C6:C500").dataValidation = { rule: { type: "list", values: ["Sí", "No"] } };

const reasons = baseSheet("Motivos", "Carga de motivos", "Motivos permitidos para crear una solicitud.");
const reasonCols = ["CodigoMotivo*", "NombreMotivo*", "Descripcion", "Activo*"];
const reasonExample = ["MOT01", "Capacitación", "Actividad de capacitación interna", "Sí"];
formatInputSheet(reasons, reasonCols, reasonExample, "CargaMotivos", [20, 32, 55, 12]);
reasons.getRange("A6:D500").format.fill = paleYellow;
reasons.getRange("A6:A500").setNumberFormat("@");
reasons.getRange("D6:D500").dataValidation = { rule: { type: "list", values: ["Sí", "No"] } };

for (const sh of [applicants, products, casinos, destinations, reasons]) {
  sh.getRange("A4").values = [["* Campo obligatorio"]];
  sh.getRange("A4").format.font = { name: font, size: 9, italic: true, color: orange };
}

wb.recalculate();
await fs.mkdir(outputDir, { recursive: true });
const out = await SpreadsheetFile.exportXlsx(wb);
await out.save(outputPath);

const inspectGuide = await wb.inspect({ kind: "table", range: "Instrucciones!A1:D25", include: "values,formulas", tableMaxRows: 25, tableMaxCols: 6 });
console.log(inspectGuide.ndjson);
const inspectApplicants = await wb.inspect({ kind: "table", range: "Solicitantes!A1:P8", include: "values,formulas", tableMaxRows: 10, tableMaxCols: 18 });
console.log(inspectApplicants.ndjson);
const errors = await wb.inspect({ kind: "match", searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!", options: { useRegex: true, maxResults: 100 }, summary: "final formula error scan" });
console.log(errors.ndjson);

const previewRanges = {
  Instrucciones: "A1:D25",
  Solicitantes: "A1:P12",
  Productos: "A1:H12",
  Casinos: "A1:F12",
  Destinos: "A1:C12",
  Motivos: "A1:D12"
};
for (const sheetName of ["Instrucciones", "Solicitantes", "Productos", "Casinos", "Destinos", "Motivos"]) {
  const preview = await wb.render({ sheetName, range: previewRanges[sheetName], scale: 1.5, format: "png" });
  await fs.writeFile(`${outputDir}/preview-${sheetName}.png`, new Uint8Array(await preview.arrayBuffer()));
}

const saved = await FileBlob.load(outputPath);
const reopened = await SpreadsheetFile.importXlsx(saved);
const savedCheck = await reopened.inspect({ kind: "sheet", include: "id,name", maxChars: 4000 });
console.log(savedCheck.ndjson);

console.log(outputPath);

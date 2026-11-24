const JSZip = require('jszip');
const { XMLParser } = require('fast-xml-parser');

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '', removeNSPrefix: true });
const list = (value) => value === undefined ? [] : Array.isArray(value) ? value : [value];

const columnIndex = (reference) => {
  const letters = String(reference || '').match(/^[A-Z]+/i)?.[0]?.toUpperCase() || 'A';
  return [...letters].reduce((value, letter) => value * 26 + letter.charCodeAt(0) - 64, 0) - 1;
};

const textValue = (cell, sharedStrings) => {
  if (cell.t === 's') return sharedStrings[Number(cell.v)] || '';
  if (cell.t === 'inlineStr') {
    const nodes = list(cell.is?.r);
    if (nodes.length) return nodes.map((node) => node.t?.['#text'] ?? node.t ?? '').join('');
    return cell.is?.t?.['#text'] ?? cell.is?.t ?? '';
  }
  if (cell.t === 'b') return Number(cell.v) === 1;
  if (cell.v === undefined || cell.v === null) return '';
  return cell.t === 'str' ? String(cell.v) : Number.isFinite(Number(cell.v)) ? Number(cell.v) : String(cell.v);
};

const readWorkbook = async (buffer) => {
  const zip = await JSZip.loadAsync(buffer);
  const workbookXml = await zip.file('xl/workbook.xml')?.async('string');
  const relsXml = await zip.file('xl/_rels/workbook.xml.rels')?.async('string');
  if (!workbookXml || !relsXml) throw new Error('INVALID_XLSX');

  const workbook = parser.parse(workbookXml);
  const rels = parser.parse(relsXml);
  const relationships = new Map(list(rels.Relationships?.Relationship).map((rel) => [rel.Id, rel.Target]));
  const sharedXml = await zip.file('xl/sharedStrings.xml')?.async('string');
  const shared = sharedXml ? parser.parse(sharedXml) : null;
  const sharedStrings = list(shared?.sst?.si).map((item) => {
    if (item.t !== undefined) return item.t?.['#text'] ?? item.t ?? '';
    return list(item.r).map((run) => run.t?.['#text'] ?? run.t ?? '').join('');
  });

  const sheets = {};
  for (const sheet of list(workbook.workbook?.sheets?.sheet)) {
    const target = relationships.get(sheet['r:id'] || sheet.id);
    const path = target?.startsWith('/') ? target.slice(1) : `xl/${String(target || '').replace(/^\.\//, '')}`;
    const xml = await zip.file(path)?.async('string');
    if (!xml) continue;
    const worksheet = parser.parse(xml);
    const rows = [];
    for (const row of list(worksheet.worksheet?.sheetData?.row)) {
      const values = [];
      for (const cell of list(row.c)) values[columnIndex(cell.r)] = textValue(cell, sharedStrings);
      rows.push(values.map((value) => value ?? ''));
    }
    sheets[String(sheet.name || '').trim()] = rows;
  }
  return sheets;
};

module.exports = { readWorkbook };

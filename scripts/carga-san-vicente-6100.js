// Excepción temporal autorizada: Andrés es responsable de ambos casinos.
// El XLSX original permanece intacto. Reejecución mediante códigos externos.
const fs = require('node:fs');
const JSZip = require('jszip');
const { getPool } = require('../src/conectorMysql/conectorSqlServer');
const carga = require('../src/services/casinoCarga.service');
async function run() {
  const pool = await getPool();
  try {
    const db = await pool.request().query('SELECT DB_NAME() name');
    if (db.recordset[0].name !== 'BDADP_CASINO') throw new Error('Base incorrecta');
    const zip = await JSZip.loadAsync(fs.readFileSync(process.argv[2]));
    let replacements = 0;
    for (const name of Object.keys(zip.files).filter(name => name.endsWith('.xml'))) {
      const original = await zip.file(name).async('string');
      const updated = original.replaceAll('manuel.rodriguezcabello@sodexo.com', () => {
        replacements++; return 'andres.andradev@gmail.com';
      });
      if (updated !== original) zip.file(name, updated);
    }
    if (!replacements) throw new Error('No se encontró el responsable esperado');
    const buffer = await zip.generateAsync({ type: 'nodebuffer' });
    const context = { empCod: 6100, login: '17526007' };
    const analysis = await carga.analyze(buffer, context);
    console.log(JSON.stringify({ valid: analysis.valid, summary: analysis.summary, errors: analysis.errors }));
    if (!analysis.valid) throw new Error('Validación fallida');
    console.log(await carga.apply(buffer, 'San Vicente - responsable temporal Andres.xlsx', context));
    console.log((await pool.request().query('SELECT CASICod,CASIRut FROM SSP06MACasinosPlanta WHERE GECODEMP=6100; SELECT COUNT(*) solicitantes FROM SSP06MASolicitante WHERE GECODEMP=6100;')).recordsets);
  } finally { await pool.close(); }
}
run().catch(error => { console.error(error.message); process.exitCode = 1; });

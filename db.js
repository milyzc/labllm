import './env.js';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import { vlog, C } from './log.js';
import { CUSTOMERS, SECRETS, REVIEWS, KB, KNOWN_PACKAGES } from './data.js';

// Base en archivo (lab.db). Para resetear: borrá el archivo y reiniciá.
const DB_PATH = process.env.DB_PATH || fileURLToPath(new URL('./lab.db', import.meta.url));
const db = new DatabaseSync(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS customers (id INTEGER PRIMARY KEY, nombre TEXT, dni TEXT, email TEXT, cbu TEXT, pedido TEXT, nota TEXT);
  CREATE TABLE IF NOT EXISTS secrets   (clave TEXT PRIMARY KEY, valor TEXT);
  CREATE TABLE IF NOT EXISTS reviews   (id INTEGER PRIMARY KEY AUTOINCREMENT, autor TEXT, texto TEXT);
  CREATE TABLE IF NOT EXISTS kb        (id INTEGER PRIMARY KEY AUTOINCREMENT, texto TEXT);
  CREATE TABLE IF NOT EXISTS packages  (nombre TEXT PRIMARY KEY);
`);

// Seed solo si está vacía
if (db.prepare('SELECT COUNT(*) AS n FROM customers').get().n === 0) {
  const insC = db.prepare('INSERT INTO customers VALUES (?,?,?,?,?,?,?)');
  for (const c of CUSTOMERS) insC.run(c.id, c.nombre, c.dni, c.email, c.cbu, c.pedido, c.nota);
  const insS = db.prepare('INSERT INTO secrets VALUES (?,?)');
  for (const [k, v] of Object.entries(SECRETS)) insS.run(k, v);
  const insR = db.prepare('INSERT INTO reviews (autor, texto) VALUES (?,?)');
  for (const r of REVIEWS) insR.run(r.autor, r.texto);
  const insK = db.prepare('INSERT INTO kb (texto) VALUES (?)');
  for (const k of KB) insK.run(k);
  const insP = db.prepare('INSERT INTO packages VALUES (?)');
  for (const p of KNOWN_PACKAGES) insP.run(p);
}

// Solo se loguean las consultas de un request del chat. `sqlLog` guarda la etiqueta a mostrar
// (null = no loguear). lab.js lo activa durante /api/chat.
let sqlLog = null;
export const setSqlLog = (on, label = '🗄️  SQL') => { sqlLog = on ? label : null; };

// Ejecuta una consulta y, si sqlLog está activo, la loguea (SQL, params, filas, ms).
function query(sql, ...params) {
  const t0 = performance.now();
  const rows = db.prepare(sql).all(...params);
  const ms = (performance.now() - t0).toFixed(2);
  if (sqlLog) vlog(`${sqlLog} · ${rows.length} fila${rows.length === 1 ? '' : 's'} · ${ms} ms`, C.magenta,
    sql + (params.length ? `\nparams: ${JSON.stringify(params)}` : ''));
  return rows;
}

// Lecturas con consultas fijas (el lab ataca al LLM, no a la DB)
export const getCustomers = () => query('SELECT * FROM customers ORDER BY id');
export const getCustomer = id => query('SELECT * FROM customers WHERE id = ?', id)[0];
export const getSecrets = () => Object.fromEntries(query('SELECT clave, valor FROM secrets').map(r => [r.clave, r.valor]));
export const getReviews = () => query('SELECT autor, texto FROM reviews ORDER BY id');
export const getKb = () => query('SELECT texto FROM kb ORDER BY id').map(r => r.texto);
export const getPackages = () => new Set(query('SELECT nombre FROM packages').map(r => r.nombre));

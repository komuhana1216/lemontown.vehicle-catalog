/*
 * Google Sheets hookup:
 * 1) Publish the source sheet to the web as CSV (File > Share > Publish to web).
 * 2) Paste the published CSV URL below, or set it as window.SHEET_CSV_URL before this script.
 * 3) Edit FIELD_MAP if your sheet has extra columns for category, image, and location.
 */
const SHEET_CSV_URL = window.SHEET_CSV_URL || 'https://docs.google.com/spreadsheets/d/1xhRXg4O3q2Hy5rZyCjFNpGnm-CJt0RAFAJQ56LGVLm8/gviz/tq?tqx=out:csv&sheet=シート1';

const FIELD_MAP = {
  name: ['車名', '車両名', '乗り物名', 'name', 'vehicle'],
  price: ['価格', '値段', 'price'],
  category: ['カテゴリ', 'カテゴリー', '種別', 'class', 'category', 'type'],
  image: ['画像', '画像URL', '写真', 'image', 'imageurl', 'photo'],
  location: ['販売場所', '売っている場所', '場所', '販売店', 'location', 'shop']
};

const CATEGORIES = [
  { id: 'all', label: 'ALL', aliases: [] },
  { id: 'normal', label: '普通車', count: 200, aliases: ['普通車', '普通', '一般車', 'normal', 'car'] },
  { id: 'luxury', label: '高級車', count: 670, aliases: ['高級車', '高級', 'luxury', 'premium'] },
  { id: 'aircraft', label: '航空機', count: null, aliases: ['航空機', '飛行機', 'aircraft', 'plane', 'airplane'] },
  { id: 'boat', label: 'ボート', count: 356, aliases: ['ボート', '船', 'boat', 'ship'] }
];

const DEFAULT_LOCATION = {
  normal: '普通車販売店', luxury: '高級車販売店', aircraft: '航空機販売店', boat: 'ボート販売店'
};
const state = { rows: [], category: 'all', query: '' };
const tabs = document.querySelector('#tabs');
const catalog = document.querySelector('#catalog');
const statusEl = document.querySelector('#status');

function normalize(value) { return String(value ?? '').trim().toLowerCase().replace(/[\s_\-　]/g, ''); }
function parseCSV(text) {
  const rows = []; let row = []; let cell = ''; let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) { if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') quoted = false; else cell += c; }
    else if (c === '"') quoted = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n') { row.push(cell.replace(/\r$/, '')); rows.push(row); row = []; cell = ''; }
    else cell += c;
  }
  if (cell.length || row.length) { row.push(cell.replace(/\r$/, '')); rows.push(row); }
  return rows.filter(r => r.some(v => String(v).trim()));
}
function getColumnIndex(headers, candidates) {
  const normalized = headers.map(normalize);
  for (const name of candidates) { const i = normalized.indexOf(normalize(name)); if (i >= 0) return i; }
  return -1;
}
function classify(value) {
  const text = normalize(value);
  return CATEGORIES.slice(1).find(cat => cat.aliases.some(alias => text.includes(normalize(alias))))?.id || '';
}
function parseRows(csv) {
  const matrix = parseCSV(csv);
  if (matrix.length < 2) return [];
  const headers = matrix[0];
  const indexes = Object.fromEntries(Object.entries(FIELD_MAP).map(([key, candidates]) => [key, getColumnIndex(headers, candidates)]));
  if (indexes.name < 0 || indexes.price < 0) throw new Error('1行目に「車名」と「価格」の見出しが必要です。');
  return matrix.slice(1).map((cells, i) => {
    const pick = key => indexes[key] < 0 ? '' : String(cells[indexes[key]] ?? '').trim();
    const rawCategory = pick('category');
    const category = classify(rawCategory) || classify(pick('name')) || '';
    const label = CATEGORIES.find(c => c.id === category)?.label || rawCategory || 'その他';
    return { id: i, name: pick('name'), price: pick('price'), category, categoryLabel: label,
      image: pick('image'), location: pick('location') || DEFAULT_LOCATION[category] || '販売場所未設定' };
  }).filter(item => item.name);
}
function safeImage(url) {
  try { const parsed = new URL(url, location.href); return ['https:', 'http:'].includes(parsed.protocol) ? parsed.href : ''; }
  catch { return ''; }
}
function categoryCount(id) {
  if (id === 'all') return state.rows.length;
  return state.rows.filter(row => row.category === id).length;
}
function renderTabs() {
  tabs.replaceChildren(...CATEGORIES.map(cat => {
    const button = document.createElement('button'); button.className = `tab${state.category === cat.id ? ' active' : ''}`;
    button.type = 'button'; button.setAttribute('aria-pressed', String(state.category === cat.id));
    const count = cat.count ?? categoryCount(cat.id);
    button.innerHTML = `${cat.label}<span class="tab-count">(${count})</span>`;
    button.addEventListener('click', () => { state.category = cat.id; render(); }); return button;
  }));
}
function visibleRows() {
  const query = normalize(state.query);
  return state.rows.filter(item => (state.category === 'all' || item.category === state.category)
    && (!query || normalize(item.name).includes(query) || normalize(item.location).includes(query)));
}
function cardFor(item) {
  const article = document.createElement('article'); article.className = 'card';
  const media = document.createElement('div'); media.className = 'image-box';
  const imageUrl = safeImage(item.image);
  if (imageUrl) { const img = document.createElement('img'); img.src = imageUrl; img.alt = item.name; img.loading = 'lazy'; img.onerror = () => { media.replaceChildren(placeholder()); }; media.append(img); }
  else media.append(placeholder());
  const tag = document.createElement('span'); tag.className = 'category-tag'; tag.textContent = item.categoryLabel; media.append(tag);
  const body = document.createElement('div'); body.className = 'card-body';
  const name = document.createElement('h3'); name.textContent = item.name;
  const price = document.createElement('div'); price.className = 'price'; price.textContent = formatPrice(item.price);
  const meta = document.createElement('div'); meta.className = 'meta';
  const label = document.createElement('span'); label.textContent = '販売場所';
  const locationText = document.createElement('span'); locationText.className = 'location'; locationText.textContent = item.location;
  meta.append(label, locationText); body.append(name, price, meta); article.append(media, body); return article;
}
function placeholder() { const el = document.createElement('div'); el.className = 'image-placeholder'; el.setAttribute('aria-label', '画像なし'); el.textContent = '◇'; return el; }
function formatPrice(value) {
  const trimmed = String(value).trim();
  if (!trimmed) return '価格未設定';
  const numeric = Number(trimmed.replace(/[¥￥円,\s]/g, ''));
  return Number.isFinite(numeric) ? `¥${new Intl.NumberFormat('ja-JP').format(numeric)}` : trimmed;
}
function render() {
  renderTabs();
  const active = CATEGORIES.find(cat => cat.id === state.category);
  document.querySelector('#category-title').textContent = active?.label || 'ALL';
  const rows = visibleRows();
  document.querySelector('#result-count').textContent = `${rows.length} 件`;
  catalog.replaceChildren();
  if (!rows.length) {
    const empty = document.createElement('div'); empty.className = 'empty';
    const strong = document.createElement('strong'); strong.textContent = state.rows.length ? '該当する乗り物がありません' : '表示できるデータがありません';
    const detail = document.createElement('span'); detail.textContent = state.rows.length ? '検索語やカテゴリを変更してください。' : 'スプレッドシートのCSV公開設定と列名を確認してください。'; empty.append(strong, detail); catalog.append(empty); return;
  }
  catalog.append(...rows.map(cardFor));
}
async function init() {
  try {
    const response = await fetch(SHEET_CSV_URL, { cache: 'no-store' });
    if (!response.ok) throw new Error(`シートの取得に失敗しました (${response.status})`);
    state.rows = parseRows(await response.text());
    statusEl.textContent = '';
    render();
  } catch (error) {
    statusEl.textContent = `${error.message} 「ファイル > 共有 > ウェブに公開」でCSVとして公開されているか確認してください。`;
    statusEl.classList.add('error');
    render();
  }
}
document.querySelector('#search').addEventListener('input', event => { state.query = event.target.value; render(); });
init();

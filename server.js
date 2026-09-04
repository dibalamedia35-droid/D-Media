const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = Number(process.env.PORT) || 3000;
const DATA_FILE = path.join(__dirname, 'data.json');
const PUBLIC_DIR = path.join(__dirname, 'public');

const seed = {
  users: [{ id: 'u-admin', name: 'D-Media Editor', email: 'admin@dmedia.news', password: 'admin123', role: 'admin' }],
  news: [
    { id: 'n-1', title: 'The next chapter of African innovation is being written now', excerpt: 'From clean energy to creative technology, a new generation of builders is reshaping the continent.', content: 'Across Africa, a new generation of builders is turning ambitious ideas into practical solutions. The story is no longer only about potential; it is about the products, communities and infrastructure being built today.\n\nFrom distributed energy to a fast-growing creative economy, local insight is becoming a competitive advantage. D-Media will keep following the people moving this story forward.', category: 'Innovation', author: 'Amara Okafor', date: '2026-09-03', readTime: '5 min read', featured: true, image: 'https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=1400&q=85' },
    { id: 'n-2', title: 'Cities rethink public space for a warmer, faster future', excerpt: 'New urban projects are putting shade, walkability and community back at the center of city life.', content: 'Cities are changing quickly, and the most thoughtful projects are making room for people first. New public spaces combine cooling landscapes, flexible transit and places to gather.', category: 'Culture', author: 'Tunde Bello', date: '2026-09-02', readTime: '4 min read', featured: false, image: 'https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=1000&q=85' },
    { id: 'n-3', title: 'The independent creators building Africa’s new media economy', excerpt: 'A look at the studios, newsletters and platforms creating more room for original voices.', content: 'Independent creators are building resilient businesses around trust, craft and a direct relationship with their audiences. Their work is changing how stories are made and shared.', category: 'Business', author: 'Nia Mensah', date: '2026-09-01', readTime: '6 min read', featured: false, image: 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=1000&q=85' },
    { id: 'n-4', title: 'Five quiet places to find a fresh perspective this weekend', excerpt: 'A considered guide to galleries, gardens and neighborhood spaces worth slowing down for.', content: 'The best reset does not always require a long journey. These local spaces offer room to think, make and reconnect with the city around you.', category: 'Lifestyle', author: 'Kemi Adeyemi', date: '2026-08-30', readTime: '3 min read', featured: false, image: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1000&q=85' },
    { id: 'n-5', title: 'Why the next wave of founders is choosing patient growth', excerpt: 'A more deliberate approach to building is taking root across the region.', content: 'For many founders, sustainable growth is replacing the pressure to move fast at any cost. The shift is creating businesses with deeper roots and stronger communities.', category: 'Business', author: 'David Obi', date: '2026-08-28', readTime: '5 min read', featured: false, image: 'https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=1000&q=85' }
  ]
};

function readData() { if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, JSON.stringify(seed, null, 2)); return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); }
function writeData(data) { fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2)); }
function json(res, status, payload) { res.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }); res.end(JSON.stringify(payload)); }
function body(req) { return new Promise((resolve, reject) => { let raw = ''; req.on('data', chunk => { raw += chunk; if (raw.length > 8e6) req.destroy(); }); req.on('end', () => { try { resolve(raw ? JSON.parse(raw) : {}); } catch (error) { reject(error); } }); }); }
function safeUser(user) { return { id: user.id, name: user.name, email: user.email, role: user.role }; }

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`); const data = readData();
  if (req.method === 'OPTIONS') { res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type' }); return res.end(); }
  try {
    if (url.pathname === '/api/news' && req.method === 'GET') return json(res, 200, data.news);
    if (url.pathname === '/api/news' && req.method === 'POST') { const item = await body(req); const news = { ...item, id: `n-${crypto.randomUUID()}`, date: item.date || new Date().toISOString().slice(0, 10) }; data.news.unshift(news); writeData(data); return json(res, 201, news); }
    if (url.pathname.startsWith('/api/news/') && ['PUT', 'DELETE'].includes(req.method)) { const id = url.pathname.split('/').pop(); const index = data.news.findIndex(item => item.id === id); if (index < 0) return json(res, 404, { error: 'Article not found' }); if (req.method === 'DELETE') data.news.splice(index, 1); else data.news[index] = { ...data.news[index], ...(await body(req)) }; writeData(data); return json(res, 200, req.method === 'DELETE' ? { ok: true } : data.news[index]); }
    if (url.pathname === '/api/auth/register' && req.method === 'POST') { const input = await body(req); if (!input.name || !input.email || !input.password) return json(res, 400, { error: 'Please complete every field.' }); if (data.users.some(user => user.email.toLowerCase() === input.email.toLowerCase())) return json(res, 409, { error: 'An account with this email already exists.' }); const user = { id: `u-${crypto.randomUUID()}`, name: input.name, email: input.email, password: input.password, role: 'reader' }; data.users.push(user); writeData(data); return json(res, 201, { user: safeUser(user) }); }
    if (url.pathname === '/api/auth/login' && req.method === 'POST') { const input = await body(req); const user = data.users.find(item => item.email.toLowerCase() === String(input.email).toLowerCase() && item.password === input.password); if (!user) return json(res, 401, { error: 'Email or password is incorrect.' }); return json(res, 200, { user: safeUser(user) }); }
    if (url.pathname.startsWith('/api/')) return json(res, 404, { error: 'Not found' });
    const requested = url.pathname === '/' ? '/index.html' : url.pathname; const file = path.normalize(path.join(PUBLIC_DIR, requested)); if (!file.startsWith(PUBLIC_DIR) || !fs.existsSync(file)) return json(res, 404, { error: 'Not found' }); const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml' }; res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' }); fs.createReadStream(file).pipe(res);
  } catch (error) { json(res, 500, { error: 'Something went wrong on the server.' }); }
});

server.listen(PORT, () => console.log(`D-Media running at http://localhost:${PORT}`));
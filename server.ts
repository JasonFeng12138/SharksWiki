import express from 'express';
import { createServer as createViteServer } from 'vite';
import fs from 'fs/promises';
import path from 'path';

const app = express();
const PORT = 3000;

app.use(express.json());

const DOCS_DIR = path.join(process.cwd(), 'docs');
const CONFIG_DIR = path.join(process.cwd(), 'config');
const UPLOADS_DIR = path.join(CONFIG_DIR, 'uploads');

async function ensureDirs() {
  const dirs = [DOCS_DIR, CONFIG_DIR, UPLOADS_DIR];
  for (const dir of dirs) {
    try {
      await fs.access(dir);
    } catch {
      await fs.mkdir(dir, { recursive: true });
    }
  }
  
  const welcomePath = path.join(DOCS_DIR, 'Welcome.md');
  try {
    await fs.access(welcomePath);
  } catch {
    await fs.writeFile(
      welcomePath,
      `# Welcome to your Personal Wiki\n\nThis is a simple, locally-hosted wiki for your markdown documents.\n\n## Features\n\n- Write in **Markdown**\n- Clean, minimal design\n- Local deployment\n- Create, edit, and delete documents\n\nStart by creating a new document or editing this one!`
    );
  }

  const configPath = path.join(CONFIG_DIR, 'wiki_config.json');
  try {
    await fs.access(configPath);
  } catch {
    await fs.writeFile(configPath, JSON.stringify({ name: 'SharksWiki', icon: '' }));
  }
}

ensureDirs();

function getSafePath(userPath: string) {
  const resolved = path.resolve(DOCS_DIR, userPath);
  if (!resolved.startsWith(DOCS_DIR)) {
    throw new Error('Invalid path');
  }
  return resolved;
}

async function buildTree(dirPath: string, relativePath: string = ''): Promise<any[]> {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  const nodes = [];
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    const fullPath = path.join(dirPath, entry.name);
    const nodePath = relativePath ? `${relativePath}/${entry.name}` : entry.name;
    
    if (entry.isDirectory()) {
      nodes.push({
        name: entry.name,
        path: nodePath,
        type: 'directory',
        children: await buildTree(fullPath, nodePath)
      });
    } else if (entry.name.endsWith('.md')) {
      const stats = await fs.stat(fullPath);
      nodes.push({
        name: entry.name,
        path: nodePath,
        type: 'file',
        updatedAt: stats.mtime,
        createdAt: stats.birthtime
      });
    }
  }
  
  nodes.sort((a, b) => {
    if (a.type === b.type) {
      if (a.type === 'file') return b.updatedAt.getTime() - a.updatedAt.getTime();
      return a.name.localeCompare(b.name);
    }
    return a.type === 'directory' ? -1 : 1;
  });
  
  return nodes;
}

// Mock Data
const MOCK_USERS: Record<string, any> = {
  admin: {
    id: 1,
    account: 'admin',
    name: 'System Admin',
    password: 'admin',
    permissions: {
      can_create_dir: true,
      can_add_file: true,
      can_delete_file: true,
      can_edit_file: true,
      can_comment: true,
    }
  },
  guest: {
    id: 2,
    account: 'guest',
    name: 'Normal User',
    password: 'guest',
    permissions: {
      can_create_dir: false,
      can_add_file: false,
      can_delete_file: false,
      can_edit_file: false,
      can_comment: true,
    }
  }
};

// Simple mock token store
const MOCK_TOKENS: Record<string, string> = {};

// Middleware to parse auth token
app.use((req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const username = MOCK_TOKENS[token];
    if (username && MOCK_USERS[username]) {
      (req as any).user = MOCK_USERS[username];
    }
  }
  next();
});

// --- 1. Auth ---
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  const user = MOCK_USERS[username];
  if (user && user.password === password) {
    const token = `mock_token_${username}_${Date.now()}`;
    MOCK_TOKENS[token] = username;
    const { password: _, ...userWithoutPassword } = user;
    res.json({ token, user: userWithoutPassword });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    delete MOCK_TOKENS[token];
  }
  res.json({ success: true });
});

app.get('/api/auth/me', (req, res) => {
  const user = (req as any).user;
  if (user) {
    const { password: _, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } else {
    res.status(401).json({ error: 'Not authenticated' });
  }
});

// --- 2. Users ---
app.put('/api/users/me/password', (req, res) => {
  const user = (req as any).user;
  if (!user) return res.status(401).json({ error: 'Not authenticated' });
  // Mock success
  res.json({ success: true });
});

app.put('/api/users/me/name', (req, res) => {
  const user = (req as any).user;
  if (!user) return res.status(401).json({ error: 'Not authenticated' });
  if (req.body.name) {
    user.name = req.body.name;
  }
  res.json({ success: true });
});

// --- 3. Documents ---
app.get('/api/documents/tree', async (req, res) => {
  try {
    const tree = await buildTree(DOCS_DIR);
    res.json(tree);
  } catch (error) {
    console.error('Error reading docs directory:', error);
    res.status(500).json({ error: 'Failed to read documents' });
  }
});

app.get('/api/documents/detail', async (req, res) => {
  try {
    const reqPath = req.query.path as string;
    if (!reqPath) return res.status(400).json({ error: 'Path is required' });
    
    const filePath = getSafePath(reqPath);
    const content = await fs.readFile(filePath, 'utf-8');
    const stats = await fs.stat(filePath);
    
    res.json({ 
      content,
      author: 'Admin', // Mock author
      createdAt: stats.birthtime,
      updatedAt: stats.mtime
    });
  } catch (error: any) {
    res.status(404).json({ error: 'Document not found' });
  }
});

app.post('/api/documents', async (req, res) => {
  try {
    const { parentPath, name, type, content } = req.body;
    const newPath = parentPath ? `${parentPath}/${name}` : name;
    const fullPath = getSafePath(newPath);

    if (type === 'directory') {
      await fs.mkdir(fullPath, { recursive: true });
    } else {
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, content || '', 'utf-8');
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create document' });
  }
});

app.put('/api/documents', async (req, res) => {
  try {
    const { path: reqPath, content } = req.body;
    if (!reqPath) return res.status(400).json({ error: 'Path is required' });
    
    const filePath = getSafePath(reqPath);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, content, 'utf-8');
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save document' });
  }
});

app.delete('/api/documents', async (req, res) => {
  try {
    const reqPath = req.query.path as string;
    if (!reqPath) return res.status(400).json({ error: 'Path is required' });
    
    const targetPath = getSafePath(reqPath);
    const stats = await fs.stat(targetPath);
    
    if (stats.isDirectory()) {
      await fs.rm(targetPath, { recursive: true, force: true });
    } else {
      await fs.unlink(targetPath);
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

// --- 5. Config ---
app.get('/api/config', async (req, res) => {
  try {
    const configPath = path.join(CONFIG_DIR, 'wiki_config.json');
    const config = await fs.readFile(configPath, 'utf-8');
    res.json(JSON.parse(config));
  } catch (error) {
    res.status(500).json({ error: 'Failed to read config' });
  }
});

app.put('/api/config', async (req, res) => {
  try {
    const configPath = path.join(CONFIG_DIR, 'wiki_config.json');
    const { name, icon } = req.body;
    await fs.writeFile(configPath, JSON.stringify({ name, icon }));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save config' });
  }
});

app.post('/api/config/icon', express.raw({ type: 'image/*', limit: '2mb' }), async (req, res) => {
  try {
    const contentType = req.headers['content-type'];
    const extension = contentType?.split('/')[1] || 'png';
    const filename = `wiki_icon_${Date.now()}.${extension}`;
    const filePath = path.join(UPLOADS_DIR, filename);

    // Remove old icons
    const files = await fs.readdir(UPLOADS_DIR);
    for (const file of files) {
      await fs.unlink(path.join(UPLOADS_DIR, file));
    }

    await fs.writeFile(filePath, req.body);
    res.json({ url: `/api/uploads/${filename}` });
  } catch (error) {
    console.error('Upload failed', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

app.get('/api/uploads/:filename', async (req, res) => {
  try {
    const filePath = path.join(UPLOADS_DIR, req.params.filename);
    const data = await fs.readFile(filePath);
    res.send(data);
  } catch (error) {
    res.status(404).send('Not found');
  }
});

// Remove old endpoints
// app.get('/api/docs', ...
// app.get('/api/docs/file/*', ...
// app.post('/api/docs/file/*', ...
// app.delete('/api/docs/file/*', ...
// app.post('/api/docs/dir/*', ...
// app.delete('/api/docs/dir/*', ...

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

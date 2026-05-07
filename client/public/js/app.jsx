/* eslint-disable */
const { useState, useEffect, useContext, createContext, useCallback } = React;
const { Routes, Route, Navigate, useNavigate } = ReactRouter;
const { BrowserRouter, Link } = ReactRouterDOM;

const TOKEN_KEY = 'devtools.token';
const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

async function request(path, { method = 'GET', body, auth = false } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const t = tokenStore.get();
    if (t) headers.Authorization = `Bearer ${t}`;
  }
  const res = await fetch(`/api${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}

const api = {
  login: (username, password) =>
    request('/auth/login', { method: 'POST', body: { username, password } }),
  me: () => request('/auth/me', { auth: true }),
  listLinks: () => request('/links'),
  createLink: (link) => request('/links', { method: 'POST', body: link, auth: true }),
  updateLink: (id, link) => request(`/links/${id}`, { method: 'PUT', body: link, auth: true }),
  deleteLink: (id) => request(`/links/${id}`, { method: 'DELETE', auth: true }),
};

const AuthContext = createContext(null);

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!tokenStore.get()) {
      setReady(true);
      return;
    }
    api.me()
      .then(setUser)
      .catch(() => tokenStore.clear())
      .finally(() => setReady(true));
  }, []);

  const login = useCallback(async (username, password) => {
    const { token, user: u } = await api.login(username, password);
    tokenStore.set(token);
    setUser(u);
  }, []);

  const logout = useCallback(() => {
    tokenStore.clear();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, ready }}>
      {children}
    </AuthContext.Provider>
  );
}

const useAuth = () => useContext(AuthContext);

function NavBar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  return (
    <header className="navbar">
      <h1>DevTools Landing</h1>
      <nav>
        <Link to="/">Home</Link>
        {user ? (
          <>
            <Link to="/admin">Admin</Link>
            <button className="ghost" onClick={() => { logout(); navigate('/'); }}>
              Sign out
            </button>
          </>
        ) : (
          <Link to="/login">Sign in</Link>
        )}
      </nav>
    </header>
  );
}

function LinkCard({ link }) {
  const initial = (link.icon || link.title.charAt(0)).toUpperCase();
  return (
    <a className="card" href={link.url} target="_blank" rel="noopener noreferrer">
      <div className="card-icon" style={{ background: link.color || '#3b82f6' }}>
        {initial}
      </div>
      <div className="card-body">
        <p className="card-title">{link.title}</p>
        {link.description && <p className="card-desc">{link.description}</p>}
      </div>
    </a>
  );
}

function Modal({ title, children, onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>{title}</h3>
        {children}
      </div>
    </div>
  );
}

const EMPTY_LINK = {
  title: '',
  url: '',
  description: '',
  icon: '',
  category: 'General',
  color: '#3b82f6',
  order: 0,
};

function LinkForm({ initial, onSubmit, onCancel, submitting }) {
  const [form, setForm] = useState(initial || EMPTY_LINK);
  const [error, setError] = useState(null);

  const update = (field) => (e) =>
    setForm({ ...form, [field]: e.target.type === 'number' ? Number(e.target.value) : e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      await onSubmit(form);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <form onSubmit={submit}>
      {error && <div className="error">{error}</div>}
      <div className="form-row">
        <label>Title *</label>
        <input required maxLength={120} value={form.title} onChange={update('title')} />
      </div>
      <div className="form-row">
        <label>URL *</label>
        <input required type="url" value={form.url} onChange={update('url')} placeholder="https://..." />
      </div>
      <div className="form-row">
        <label>Description</label>
        <input maxLength={500} value={form.description} onChange={update('description')} />
      </div>
      <div className="form-row">
        <label>Category</label>
        <input maxLength={60} value={form.category} onChange={update('category')} />
      </div>
      <div className="form-row">
        <label>Icon (single character or emoji — first letter of title used if blank)</label>
        <input maxLength={4} value={form.icon} onChange={update('icon')} />
      </div>
      <div className="form-row">
        <label>Color</label>
        <input type="color" value={form.color || '#3b82f6'} onChange={update('color')} />
      </div>
      <div className="form-row">
        <label>Order (lower numbers appear first)</label>
        <input type="number" value={form.order} onChange={update('order')} />
      </div>
      <div className="form-actions">
        <button type="button" onClick={onCancel}>Cancel</button>
        <button type="submit" className="primary" disabled={submitting}>
          {submitting ? 'Saving…' : 'Save'}
        </button>
      </div>
    </form>
  );
}

function Landing() {
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.listLinks()
      .then(setLinks)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="container"><div className="loading">Loading…</div></div>;

  const grouped = links.reduce((acc, l) => {
    const c = l.category || 'General';
    (acc[c] ||= []).push(l);
    return acc;
  }, {});
  const categories = Object.keys(grouped).sort();

  return (
    <div className="container">
      <section className="hero">
        <h2>Developer Tools</h2>
        <p>One-click access to the systems you use day to day.</p>
      </section>
      {error && <div className="error">{error}</div>}
      {!error && links.length === 0 && (
        <div className="empty">
          <p>No links configured yet.</p>
          <p>Sign in as an administrator to add some.</p>
        </div>
      )}
      {categories.map((cat) => (
        <section className="category" key={cat}>
          <h3>{cat}</h3>
          <div className="grid">
            {grouped[cat].map((l) => <LinkCard key={l.id} link={l} />)}
          </div>
        </section>
      ))}
    </div>
  );
}

function Login() {
  const { login, user } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  if (user) return <Navigate to="/admin" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(username, password);
      navigate('/admin');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={submit}>
        <h2>Administrator Sign-in</h2>
        {error && <div className="error">{error}</div>}
        <div className="form-row">
          <label>Username</label>
          <input
            required
            autoFocus
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>
        <div className="form-row">
          <label>Password</label>
          <input
            required
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <div className="form-actions">
          <button type="submit" className="primary" disabled={submitting}>
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </div>
      </form>
    </div>
  );
}

function Admin() {
  const { user } = useAuth();
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setLinks(await api.listLinks());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  if (!user) return <Navigate to="/login" replace />;

  const onSubmit = async (form) => {
    setSubmitting(true);
    try {
      if (editing === 'new') {
        await api.createLink(form);
      } else {
        await api.updateLink(editing.id, form);
      }
      setEditing(null);
      await refresh();
    } finally {
      setSubmitting(false);
    }
  };

  const onDelete = async (link) => {
    if (!window.confirm(`Delete "${link.title}"?`)) return;
    try {
      await api.deleteLink(link.id);
      await refresh();
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div className="container">
      <div className="admin-header">
        <h2>Manage Links</h2>
        <button className="primary" onClick={() => setEditing('new')}>+ New link</button>
      </div>
      {error && <div className="error">{error}</div>}
      {loading ? (
        <div className="loading">Loading…</div>
      ) : links.length === 0 ? (
        <div className="empty"><p>No links yet — add one to get started.</p></div>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>URL</th>
              <th>Category</th>
              <th>Order</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {links.map((l) => (
              <tr key={l.id}>
                <td>{l.title}</td>
                <td><a href={l.url} target="_blank" rel="noopener noreferrer">{l.url}</a></td>
                <td>{l.category}</td>
                <td>{l.order}</td>
                <td>
                  <div className="actions">
                    <button onClick={() => setEditing(l)}>Edit</button>
                    <button className="danger" onClick={() => onDelete(l)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {editing && (
        <Modal
          title={editing === 'new' ? 'Create link' : 'Edit link'}
          onClose={() => setEditing(null)}
        >
          <LinkForm
            initial={editing === 'new' ? null : editing}
            onSubmit={onSubmit}
            onCancel={() => setEditing(null)}
            submitting={submitting}
          />
        </Modal>
      )}
    </div>
  );
}

function App() {
  const { ready } = useAuth();
  if (!ready) return <div className="loading">Loading…</div>;
  return (
    <>
      <NavBar />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <AuthProvider>
      <App />
    </AuthProvider>
  </BrowserRouter>
);

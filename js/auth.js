// Moduł kont użytkowników — makieta bez backendu.
// Konta, sesja i historia zamówień są trzymane w localStorage tej przeglądarki.
// Hasła są solone i hashowane (SHA-256), ale to NIE jest prawdziwe zabezpieczenie.
window.Auth = (() => {
  'use strict';

  const USERS_KEY = 'ziarno-users';
  const SESSION_KEY = 'ziarno-session';

  const read = (key, fallback) => {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
  };
  const write = (key, value) => {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* tryb prywatny */ }
  };

  const normEmail = e => String(e).trim().toLowerCase();

  async function hash(password, salt) {
    const data = new TextEncoder().encode(salt + ':' + password);
    if (window.crypto?.subtle) {
      const buf = await crypto.subtle.digest('SHA-256', data);
      return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
    }
    // Awaryjnie (kontekst niezabezpieczony) — prosty hash FNV-1a.
    let h = 0x811c9dc5;
    for (const b of data) { h ^= b; h = Math.imul(h, 0x01000193) >>> 0; }
    return 'fnv' + h.toString(16);
  }

  const randomSalt = () => {
    const a = new Uint8Array(16);
    crypto.getRandomValues(a);
    return [...a].map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const users = () => read(USERS_KEY, {});
  const saveUsers = u => write(USERS_KEY, u);

  // Zwraca dane użytkownika bez pól z hasłem.
  const publicUser = u => {
    if (!u) return null;
    const { passwordHash, salt, ...rest } = u;
    return rest;
  };

  function current() {
    const email = read(SESSION_KEY, null);
    return email ? publicUser(users()[email]) : null;
  }

  async function register({ name, email, password }) {
    email = normEmail(email);
    const all = users();
    if (all[email]) throw new Error('Konto z tym adresem e-mail już istnieje.');
    const salt = randomSalt();
    all[email] = {
      email,
      name: name.trim(),
      salt,
      passwordHash: await hash(password, salt),
      createdAt: new Date().toISOString(),
      address: {},
      orders: [],
    };
    saveUsers(all);
    write(SESSION_KEY, email);
    return publicUser(all[email]);
  }

  async function login(email, password) {
    email = normEmail(email);
    const u = users()[email];
    if (!u || u.passwordHash !== await hash(password, u.salt)) {
      throw new Error('Nieprawidłowy e-mail lub hasło.');
    }
    write(SESSION_KEY, email);
    return publicUser(u);
  }

  function logout() {
    try { localStorage.removeItem(SESSION_KEY); } catch { /* ignoruj */ }
  }

  function update(patch) {
    const me = current();
    if (!me) return null;
    const all = users();
    Object.assign(all[me.email], patch);
    saveUsers(all);
    return publicUser(all[me.email]);
  }

  async function changePassword(oldPassword, newPassword) {
    const me = current();
    if (!me) throw new Error('Musisz być zalogowany.');
    const all = users();
    const u = all[me.email];
    if (u.passwordHash !== await hash(oldPassword, u.salt)) {
      throw new Error('Obecne hasło jest nieprawidłowe.');
    }
    u.salt = randomSalt();
    u.passwordHash = await hash(newPassword, u.salt);
    saveUsers(all);
  }

  function addOrder(order) {
    const me = current();
    if (!me) return;
    update({ orders: [order, ...me.orders] });
  }

  function deleteAccount() {
    const me = current();
    if (!me) return;
    const all = users();
    delete all[me.email];
    saveUsers(all);
    logout();
  }

  return { SESSION_KEY, USERS_KEY, current, register, login, logout, update, changePassword, addOrder, deleteAccount };
})();

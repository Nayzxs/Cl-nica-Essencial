
import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js';

import {
  getFirestore,
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';

import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  signOut
} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js';

import {
  firebaseConfig,
  adminUIDs,
  configured
} from './firebase-config.js';

const app = configured ? initializeApp(firebaseConfig) : null;

export const db = app ? getFirestore(app) : null;
export const auth = app ? getAuth(app) : null;

export function isAdmin(user) {
  return Boolean(
    user && adminUIDs.includes(user.uid)
  );
}

export {
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  signOut,
  configured,
  adminUIDs
};

export const escapeHTML = s =>
  String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[c]));

export function card(id, p) {
  const href = 'artigo.html?id=' + encodeURIComponent(id);
  const title = escapeHTML(p.titulo);

  const validImage = p.imagem &&
    /^(https:\/\/|data:image\/jpeg;base64,)/i.test(p.imagem);

  const img = validImage
    ? `<img loading="lazy" src="${escapeHTML(p.imagem)}" alt="${title}">`
    : '<span class="blog-placeholder">Clínica Essencial</span>';

  return `
    <article class="blog-card">
      <a class="blog-card-image" href="${href}">
        ${img}
      </a>

      <div class="blog-card-meta">
        ${escapeHTML(p.categoria || 'Cuidados com os pés')}
      </div>

      <h3>
        <a href="${href}">${title}</a>
      </h3>

      <p>${escapeHTML(p.resumo || '')}</p>

      <a class="blog-card-leia" href="${href}">
        Ler artigo ↗
      </a>
    </article>
  `;
}

export const noConfig =
  'O blog está sendo preparado. A configuração do Firebase ainda não foi concluída.';

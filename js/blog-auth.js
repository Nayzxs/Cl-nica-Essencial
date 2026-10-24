
import {
  auth,
  configured,
  isAdmin,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  signOut
} from './blog-common.js';

const btn = document.getElementById('google-login');
const status = document.getElementById('login-status');

if (!configured) {
  btn.disabled = true;
  status.textContent = 'Configure o Firebase para ativar o login.';
} else {

  onAuthStateChanged(auth, async user => {
    if (isAdmin(user)) {
      location.replace('painel-blog.html');
      return;
    }

    if (user) {
      await signOut(auth);
      status.textContent = 'Esta conta não tem autorização.';
    }
  });

  btn.onclick = async () => {
    btn.disabled = true;

    try {
      status.textContent = 'Abrindo sua conta Google...';

      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);

      if (!isAdmin(result.user)) {
        await signOut(auth);
        status.textContent = 'Esta conta não tem autorização.';
        return;
      }

      location.href = 'painel-blog.html';

    } catch (error) {
      console.error(error);

      status.textContent =
        'Não foi possível entrar com Google. Tente novamente.';

    } finally {
      btn.disabled = false;
    }
  };
}


import {
  auth, db, configured, isAdmin,
  onAuthStateChanged, signOut, collection,
  query, orderBy, getDocs, addDoc, updateDoc,
  deleteDoc, doc, serverTimestamp
} from './blog-common.js';

// ELEMENTOS DO PAINEL
const status = document.getElementById('admin-status');
const section = document.getElementById('admin-restrito');
const form = document.getElementById('form-post');
const editor = document.getElementById('post-conteudo');
const list = document.getElementById('lista-admin');
const save = document.getElementById('publicar');

let editing = null;
let oldImage = '';
let user = null;
let removeImage = false;
let previewUrl = null;
let working = false;

// =====================================
// AUTENTICAÇÃO DOS ADMINISTRADORES
// =====================================

if (!configured) {
  status.textContent = 'Configure o Firebase para ativar o painel.';
} else {
  onAuthStateChanged(auth, u => {
    user = u;

    // Aceita somente os UIDs autorizados
    if (!isAdmin(u)) {
      section.hidden = true;
      status.textContent = 'Acesso restrito aos administradores.';
      return;
    }

    section.hidden = false;
    status.textContent = 'Conta autorizada.';
    load();
  });
}

// SAIR DA CONTA
document.getElementById('sair').onclick = async () => {
  if (auth) await signOut(auth);
  location.href = 'entrar.html';
};

// =====================================
// EDITOR DE TEXTO
// =====================================

document.querySelectorAll('[data-format]').forEach(btn => {
  btn.addEventListener('click', () => {
    editor.focus();

    const cmd = btn.dataset.format;

    if (cmd === 'createLink') {
      const url = prompt('Cole o link completo (https://):');

      if (url && /^https?:\/\//i.test(url)) {
        document.execCommand('createLink', false, url);
      }
    } else {
      document.execCommand(
        cmd,
        false,
        btn.dataset.value || null
      );
    }
  });
});

// =====================================
// GERENCIAMENTO DAS FOTOS
// =====================================

const photoInput = document.getElementById('post-imagem');
const photoUrl = document.getElementById('post-imagem-url');
const photoBox = document.getElementById('post-imagem-preview');
const photoView = document.getElementById('post-imagem-visualizacao');

// MOSTRAR FOTO
function setPhotoPreview(src) {
  if (previewUrl) {
    URL.revokeObjectURL(previewUrl);
    previewUrl = null;
  }

  if (!src) {
    photoView.removeAttribute('src');
    photoBox.hidden = true;
    return;
  }

  photoView.src = src;
  photoBox.hidden = false;
}

// ATUALIZAR VISUALIZAÇÃO
function syncPhoto() {
  const file = photoInput.files[0];
  const url = photoUrl.value.trim();

  if (file) {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    previewUrl = URL.createObjectURL(file);
    photoView.src = previewUrl;
    photoBox.hidden = false;

  } else if (url) {
    setPhotoPreview(url);

  } else if (oldImage && !removeImage) {
    setPhotoPreview(oldImage);

  } else {
    setPhotoPreview('');
  }
}

// SELECIONAR FOTO
photoInput.addEventListener('change', () => {
  if (photoInput.files.length) {
    photoUrl.value = '';
    removeImage = false;
  }

  syncPhoto();
});

// INSERIR FOTO POR URL
photoUrl.addEventListener('input', () => {
  if (photoUrl.value.trim()) {
    photoInput.value = '';
    removeImage = false;
  }

  syncPhoto();
});

// TROCAR FOTO
document.getElementById('post-imagem-trocar').onclick = () => {
  photoInput.click();
};

// REMOVER FOTO
document.getElementById('post-imagem-remover').onclick = () => {
  removeImage = true;
  oldImage = '';

  photoInput.value = '';
  photoUrl.value = '';

  syncPhoto();
};

// =====================================
// COMPRIMIR FOTO PARA O FIRESTORE
// =====================================

async function compressImage(file) {

  const tiposPermitidos = [
    'image/jpeg',
    'image/png',
    'image/webp'
  ];

  if (!tiposPermitidos.includes(file.type)) {
    throw new Error('Escolha uma imagem JPG, PNG ou WebP.');
  }

  if (file.size > 15 * 1024 * 1024) {
    throw new Error('A foto deve ter no máximo 15 MB.');
  }

  const objectUrl = URL.createObjectURL(file);

  try {
    const image = new Image();
    image.src = objectUrl;

    await image.decode();

    if (!image.naturalWidth || !image.naturalHeight) {
      throw new Error('Foto inválida.');
    }

    let maxSide = 960;

    for (let attempt = 0; attempt < 6; attempt++) {

      const scale = Math.min(
        1,
        maxSide / Math.max(
          image.naturalWidth,
          image.naturalHeight
        )
      );

      const canvas = document.createElement('canvas');

      canvas.width = Math.max(
        1,
        Math.round(image.naturalWidth * scale)
      );

      canvas.height = Math.max(
        1,
        Math.round(image.naturalHeight * scale)
      );

      const ctx = canvas.getContext('2d');

      if (!ctx) {
        throw new Error('Erro ao processar a imagem.');
      }

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.drawImage(
        image,
        0,
        0,
        canvas.width,
        canvas.height
      );

      for (const quality of [0.78, 0.62, 0.48, 0.34]) {

        const data = canvas.toDataURL(
          'image/jpeg',
          quality
        );

        if (data.length <= 170 * 1024) {
          return data;
        }
      }

      maxSide = Math.round(maxSide * 0.75);
    }

    throw new Error('Não foi possível reduzir a foto.');

  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

// =====================================
// LIMPAR FORMULÁRIO
// =====================================

const val = id => document.getElementById(id).value.trim();

function reset() {
  editing = null;
  oldImage = '';
  removeImage = false;

  form.reset();

  setPhotoPreview('');

  editor.innerHTML = '';

  save.textContent = 'Publicar artigo';

  document.getElementById('cancelar-edicao').hidden = true;
}

// CANCELAR EDIÇÃO
document.getElementById('cancelar-edicao').onclick = () => {
  if (working) return;

  reset();

  status.textContent = 'Edição cancelada.';
};

// ERRO AO CARREGAR FOTO
photoView.addEventListener('error', () => {
  if (!photoBox.hidden) {
    status.textContent = 'Não foi possível carregar a foto.';
  }
});

// =====================================
// LIMPEZA DO CONTEÚDO DO EDITOR
// =====================================

function sanitizeEditor(html) {

  const parsed = new DOMParser().parseFromString(
    html,
    'text/html'
  );

  const allowed = new Set([
    'P', 'BR', 'B', 'STRONG',
    'I', 'EM', 'U',
    'H2', 'H3',
    'UL', 'OL', 'LI',
    'A', 'BLOCKQUOTE'
  ]);

  function clean(node) {

    for (const child of [...node.childNodes]) {

      if (child.nodeType === 8) {
        child.remove();
        continue;
      }

      if (child.nodeType !== 1) continue;

      if (!allowed.has(child.tagName)) {
        clean(child);
        child.replaceWith(...child.childNodes);
        continue;
      }

      for (const attr of [...child.attributes]) {

        if (
          child.tagName === 'A' &&
          attr.name === 'href' &&
          /^https?:\/\//i.test(attr.value)
        ) {
          continue;
        }

        child.removeAttribute(attr.name);
      }

      clean(child);
    }
  }

  clean(parsed.body);

  return parsed.body.innerHTML;
}

// =====================================
// LISTAR, EDITAR E EXCLUIR ARTIGOS
// =====================================

async function load() {

  try {

    const snap = await getDocs(
      query(
        collection(db, 'artigos'),
        orderBy('criadoEm', 'desc')
      )
    );

    list.replaceChildren();

    if (snap.empty) {
      const empty = document.createElement('p');

      empty.textContent = 'Nenhum artigo publicado.';

      list.append(empty);
      return;
    }

    snap.forEach(snapshot => {

      const article = snapshot.data();

      const item = document.createElement('div');
      item.className = 'admin-item';

      const title = document.createElement('strong');

      title.textContent = article.titulo || 'Sem título';

      // EDITAR ARTIGO
      const edit = document.createElement('button');

      edit.type = 'button';
      edit.textContent = 'Editar';

      edit.onclick = () => {

        if (working) return;

        editing = snapshot.id;
        oldImage = article.imagem || '';
        removeImage = false;

        photoInput.value = '';
        photoUrl.value = '';

        setPhotoPreview(oldImage);

        document.getElementById('post-titulo').value =
          article.titulo || '';

        document.getElementById('post-resumo').value =
          article.resumo || '';

        document.getElementById('post-categoria').value =
          article.categoria || '';

        editor.innerHTML = sanitizeEditor(
          article.conteudo || ''
        );

        document.getElementById('post-fontes').value =
          Array.isArray(article.fontes)
            ? article.fontes.join('\n')
            : '';

        save.textContent = 'Salvar alterações';

        document.getElementById('cancelar-edicao').hidden =
          false;

        status.textContent =
          'Editando: ' + (article.titulo || 'artigo');

        window.scrollTo({
          top: 0,
          behavior: 'smooth'
        });
      };

      // EXCLUIR ARTIGO
      const del = document.createElement('button');

      del.type = 'button';
      del.textContent = 'Excluir';

      del.onclick = async () => {

        // Permite os dois administradores
        if (working || !isAdmin(user)) return;

        const confirmar = confirm(
          'Excluir permanentemente o artigo "' +
          (article.titulo || 'Sem título') + '"?'
        );

        if (!confirmar) return;

        working = true;

        del.disabled = true;
        edit.disabled = true;

        status.textContent = 'Excluindo artigo...';

        try {

          await deleteDoc(
            doc(db, 'artigos', snapshot.id)
          );

          if (editing === snapshot.id) {
            reset();
          }

          await load();

          status.textContent =
            'Artigo excluído com sucesso.';

        } catch (error) {

          console.error(error);

          status.textContent =
            'Não foi possível excluir o artigo.';

        } finally {

          working = false;
          del.disabled = false;
          edit.disabled = false;
        }
      };

      item.append(title, edit, del);

      list.append(item);
    });

  } catch (error) {

    console.error(error);

    list.textContent =
      'Não foi possível listar os artigos.';
  }
}

// =====================================
// PUBLICAR OU SALVAR ALTERAÇÕES
// =====================================

form.onsubmit = async e => {

  e.preventDefault();

  // Somente administradores autorizados
  if (working || !isAdmin(user)) return;

  const titulo = val('post-titulo');
  const resumo = val('post-resumo');

  const conteudo = sanitizeEditor(
    editor.innerHTML
  );

  const file = photoInput.files[0];
  const url = photoUrl.value.trim();

  // VALIDAR CAMPOS
  if (!titulo || !resumo || !editor.textContent.trim()) {

    status.textContent =
      'Preencha título, resumo e conteúdo.';

    return;
  }

  // VALIDAR URL
  if (url && !/^https:\/\/[^\s]+$/i.test(url)) {

    status.textContent =
      'Digite um endereço de imagem HTTPS válido.';

    return;
  }

  working = true;
  save.disabled = true;

  status.textContent = 'Salvando artigo...';

  try {

    let imagem = removeImage ? '' : oldImage;

    if (url) {
      imagem = url;
    }

    if (file) {

      status.textContent = 'Otimizando a foto...';

      imagem = await compressImage(file);
    }

    const categoria = val('post-categoria');

    const fontes = val('post-fontes')
      .split('\n')
      .map(x => x.trim())
      .filter(Boolean);

    // VERIFICAR TAMANHO DO ARTIGO
    const tamanho = new TextEncoder().encode(
      JSON.stringify({
        titulo,
        resumo,
        conteudo,
        imagem,
        categoria,
        fontes
      })
    ).length;

    if (tamanho > 850 * 1024) {

      throw new Error(
        'Artigo grande demais. Reduza o texto ou a imagem.'
      );
    }

    const data = {
      titulo,
      resumo,
      conteudo,
      imagem,
      categoria,
      fontes,
      atualizadoEm: serverTimestamp()
    };

    // EDITAR ARTIGO EXISTENTE
    if (editing) {

      await updateDoc(
        doc(db, 'artigos', editing),
        data
      );

    } else {

      // CRIAR NOVO ARTIGO
      await addDoc(
        collection(db, 'artigos'),
        {
          ...data,
          criadoEm: serverTimestamp()
        }
      );
    }

    const foiEdicao = Boolean(editing);

    reset();

    await load();

    status.textContent = foiEdicao
      ? 'Artigo atualizado com sucesso!'
      : 'Artigo publicado com sucesso!';

  } catch (error) {

    console.error(error);

    status.textContent = error.message && !error.code
      ? error.message
      : 'Não foi possível salvar o artigo. Verifique o Firestore.';

  } finally {

    working = false;
    save.disabled = false;
  }
};

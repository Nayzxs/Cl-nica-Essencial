export const firebaseConfig = {
  apiKey: "AIzaSyCsbWSMM8yQk1LD1wrJp-ylEOxj_4Abr70",
  authDomain: "clinica-essencial-podologia.firebaseapp.com",
  projectId: "clinica-essencial-podologia",
  storageBucket: "clinica-essencial-podologia.firebasestorage.app",
  messagingSenderId: "451297510754",
  appId: "1:451297510754:web:73fe8749c8672d386b583b"
};


function isAdmin() {
  return request.auth != null
    && request.auth.uid in [
      '1mQ8LdWKatg6ah7Y8zwzYWzGjW82',
      'qnuBdonKSycZCy9LnEsYhTyEfmx1'
    ];
}
export const configured = firebaseConfig.projectId !== "SUBSTITUIR";



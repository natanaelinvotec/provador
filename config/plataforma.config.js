/*
 * Configuração da plataforma.
 * Firebase do projeto "provador" (ID provador-6416d). Para ligar o banco de verdade,
 * cole só a apiKey abaixo (Console do Firebase > Configurações do projeto > Seus apps > provador-web).
 * Enquanto a apiKey não for colada, tudo roda em modo demonstração (dados no navegador).
 */
window.PROVADOR_CONFIG = {
  nome: 'Provador',
  firebase: {
    apiKey: 'COLE_AQUI_A_API_KEY',
    authDomain: 'provador-6416d.firebaseapp.com',
    projectId: 'provador-6416d',
    storageBucket: 'provador-6416d.firebasestorage.app',
    messagingSenderId: '741969562955',
    appId: '1:741969562955:web:fd484f78ea30c7e83bacce'
  },
  // true depois de publicar a pasta functions/ (exige o plano Blaze). Com false, o painel calcula o resumo no navegador.
  funcoes: false,
  // endereços onde a própria plataforma roda; qualquer outro domínio abre a loja dona do domínio
  hostsDaPlataforma: ['localhost', '127.0.0.1', 'natanaelinvotec.github.io', 'provador-6416d.web.app', 'provador-6416d.firebaseapp.com'],
  whatsappComercial: '',
  fuso: 'America/Campo_Grande'
};

/*
 * Configuração da plataforma. Sem `firebase`, tudo roda em modo demonstração
 * (dados salvos neste navegador). Para ligar o Firebase, cole aqui o objeto de
 * configuração web do projeto (Console do Firebase > Configurações do projeto > Seus apps).
 */
window.PROVADOR_CONFIG = {
  nome: 'Provador',
  // firebase: { apiKey: '...', authDomain: '...', projectId: '...', storageBucket: '...', appId: '...' },
  firebase: null,
  // endereços onde a própria plataforma roda; qualquer outro domínio abre a loja dona do domínio
  hostsDaPlataforma: ['localhost', '127.0.0.1', 'provador.web.app', 'provador.firebaseapp.com'],
  whatsappComercial: '',
  fuso: 'America/Campo_Grande'
};

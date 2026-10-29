# PlayMaster Air

Tela do PlayMaster Air com playlist única para até 14 faixas, ícones coloridos por categoria e integração com a Biblioteca Central do PlayMaster Auto Import.

## Integração segura

A aplicação faz login com a conta do painel Auto Import. O servidor não coloca o token da API no navegador: o Nginx do subdomínio air.apcgestor.com.br serve a tela e encaminha as rotas /api/ para 127.0.0.1:3600, mantendo a sessão protegida por HTTPS e cookie HttpOnly.

Ao sincronizar, o Air consulta as faixas prontas das dez categorias (Músicas, Comerciais, Vinhetas, Intercons, Trilhas, Chamadas, Locução, Hora Certa, Temperatura e Outros), baixa os MP3 processados da categoria selecionada para o armazenamento local do navegador (IndexedDB) e confirma cada cópia para o consumidor studio. O primeiro botão reproduz o áudio salvo. O shell da aplicação fica disponível offline após o primeiro acesso HTTPS; no Safari, adicione o Air à Tela de Início para reabrir como app.

## Publicação no VPS

Crie no DNS um registro A para air.apcgestor.com.br apontando para o mesmo VPS do Auto Import. No repositório GitHub, adicione estes Actions secrets:

- VPS_HOST
- VPS_USER
- VPS_PORT (opcional; usa 22 se não informado)
- VPS_SSH_KEY
- AIR_DEPLOY_PATH — caminho exclusivo para o Air, por exemplo /var/www/playmaster-air

O workflow valida cada envio para main. Quando os secrets estão configurados, publica a página, configura o Nginx com proxy da API e tenta provisionar HTTPS com Certbot. Sem DNS/HTTPS, a tela pode abrir em HTTP, mas as rotas de autenticação ficam bloqueadas até o certificado ficar disponível.

## Uso

Abra https://air.apcgestor.com.br, entre com o usuário e a senha do Auto Import e aguarde a sincronização. O navegador mantém as cópias já sincronizadas neste dispositivo, para reprodução quando o Auto Import estiver temporariamente indisponível. A playlist pode intercalar músicas, vinhetas, comerciais e hora certa na ordem programada.

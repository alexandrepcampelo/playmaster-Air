# Cloudflare — PlayMaster Air em /Air/

Esta pasta contém a camada de roteamento planejada para publicar o Air em
`https://playmastersolutions.com.br/Air/` usando Cloudflare Pages + Worker.

## Arquitetura

- Cloudflare Pages hospeda os arquivos estáticos do Air na raiz do projeto.
- O Worker recebe `/Air/*` e remove o prefixo ao encaminhar para a origem.
- `/Air/api/*` é encaminhado separadamente para um backend compatível, quando
  `AIR_API_ORIGIN` estiver configurado. Sem essa variável, responde HTTP 503
  com código `AIR_API_ORIGIN_MISSING` — não finge que as APIs estão funcionando.
- As demais rotas do domínio não são alteradas pelo Worker.

## Publicação Pages

1. Criar um projeto Cloudflare Pages conectado ao repositório
   `alexandrepcampelo/playmaster-Air`, branch `cloudflare-pages-air`.
2. Definir a raiz do projeto como `/`, sem comando de build e sem diretório de saída
   separado (os arquivos HTML/JS já estão na raiz).
3. Aguardar o hostname `*.pages.dev` e configurar `AIR_PAGES_ORIGIN` no Worker
   com esse hostname, incluindo `https://` e sem barra final.

## Worker

- Associar o Worker à rota `playmastersolutions.com.br/Air*` somente após validar
  a URL `*.pages.dev`.
- Definir `AIR_PAGES_ORIGIN` como variável obrigatória.
- Definir `AIR_API_ORIGIN` somente quando o backend estiver implantado e validado.
- Definir `AIR_TRAFFIC_ORIGIN` somente quando o PlayMaster Traffic estiver implantado e validado.
  O backend precisa oferecer o contrato atual de `/api/*), incluindo sessão,
  biblioteca/áudio, RSS, imports e envio de Voice Track.

## Estado e limites

- Os caminhos de scripts, API, manifest e service worker do frontend foram adaptados
  para o prefixo `/Air/`.
- O service worker usa escopo `/Air/` e não intercepta chamadas `/Air/api/*).
- Auto Import, Traffic e Engine foram removidos da VPS anterior. A publicação estática
  não recupera esses serviços. O backend e a integração Traffic/Engine ainda precisam
  ser reconstruídos ou hospedados em outro ambiente.
- Não houve alteração de DNS, domínio, VPS ou branch principal.

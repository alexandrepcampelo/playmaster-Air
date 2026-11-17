# Cloudflare — PlayMaster Air em /Air/

Esta pasta contém a camada de roteamento planejada para publicar o Air em
`https://playmastersolutions.com.br/Air/` usando Cloudflare Pages + Worker.

## Arquitetura

- Cloudflare Pages hospeda os arquivos estáticos do Air.
- O Worker recebe apenas o caminho `/Air/*` e encaminha a requisição ao projeto Pages,
  removendo o prefixo `/Air` na origem. A URL visível no navegador permanece em
  `playmastersolutions.com.br/Air/`.
- O restante do domínio não é alterado pelo Worker.
- APIs de autenticação, catálogo, áudio, gravação e integração Traffic/Engine
  precisam de backends próprios. Não apontar essas rotas para serviços removidos da VPS.

## Configuração do Worker

1. Criar o projeto Pages conectado à branch `cloudflare-pages-air`.
2. Publicar os arquivos estáticos na raiz do projeto (sem build command).
3. Anotar o hostname `*.pages.dev` criado pelo Pages.
4. Configurar a variável de ambiente do Worker `AIR_PAGES_ORIGIN` com esse hostname,
   incluindo `https://` e sem barra final.
5. Associar a rota do Worker a `playmastersolutions.com.br/Air*` somente depois
   de validar o Pages e preservar os registros DNS existentes.

## Estado e limites

O roteador não ativa sozinho APIs nem substitui os serviços Auto Import, Traffic e Engine.
Antes de ativar a rota pública, a aplicação também precisa usar caminhos compatíveis
com o prefixo `/Air/` para seus arquivos estáticos, manifest e service worker, e as
rotas de API devem ser direcionadas a um backend disponível.

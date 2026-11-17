# Backend recomendado para a migração Cloudflare

## Conclusão da auditoria

O repositório `alexandrepcampelo/playmaster-auto-import` já contém a implementação Node.js do backend que o Air utiliza. Não é necessário reescrever login, biblioteca e upload do zero. O código atual implementa `/api/login`, `/api/me`, `/api/rss`, `/api/imports/:id`, `/api/library`, `/api/library/:id/audio` e `/api/voice-track`, além das rotas administrativas e do agente.

## Onde cada parte deve rodar

- **Cloudflare Pages:** interface estática do Air, manifest e scripts.
- **Cloudflare Worker:** roteamento do prefixo `/Air/` e proxy same-origin de `/Air/api/*` para o backend.
- **Backend Auto Import:** continuar no repositório `alexandrepcampelo/playmaster-auto-import`, executado em runtime Node.js 20+ com FFmpeg/FFprobe e armazenamento persistente. O código usa `node:fs`, arquivos JSON e diretórios locais; não pode ser publicado como um site estático do Pages nem simplesmente executado como Worker.
- **Biblioteca de áudio:** volume persistente do backend (ou migração planejada para object storage compatível, com alterações no backend). Não armazenar a biblioteca somente no filesystem efêmero de um container.

## Compatibilidade confirmada no código

- O Air usa `/Air/api/me`, `/Air/api/login`, `/Air/api/library`, `/Air/api/library/:id/audio`, `/Air/api/imports/:id` e `/Air/api/voice-track`.
- O Worker remove `/Air` ao encaminhar, portanto o backend recebe as rotas originais `/api/*`.
- O backend Auto Import usa cookie `pm_auto_session`; como o navegador chama o Worker no mesmo domínio do Air, o fluxo pode permanecer same-origin. Validar `Set-Cookie`, caminho, `Secure` e sessão em teste de ponta a ponta antes de produção.
- A API de biblioteca devolve `items`; o Air já consome esse formato.
- O streaming de áudio deve preservar Range/206 e headers de resposta através do Worker.
- O envio de Voice Track exige WAV e autenticação por sessão ou token; validar o formato binário e os headers enviados pelo Air.

## Serviços separados

- O Air consulta `/Air/traffic-api/next-block`, encaminhado pelo Worker para `AIR_TRAFFIC_ORIGIN`. Esse endpoint é do PlayMaster Traffic, não do Auto Import. O repositório `alexandrepcampelo/playmaster-traffic` permanece como fonte do serviço, mas a instância de produção foi removida da VPS anterior. Será necessário publicar e validar o Traffic em runtime próprio antes de recuperar a integração.
- O repositório `alexandrepcampelo/playmaster-engine` é outro serviço independente. A interface Air não deve apontar para um endpoint Engine antigo sem que o Engine esteja novamente publicado.

## Próxima sequência segura

1. Escolher um runtime de container para Auto Import com disco persistente, FFmpeg e HTTPS. Cloudflare fica como DNS/proxy e Pages para o frontend.
2. Implantar Auto Import em hostname próprio, configurar segredos fora do Git e testar health, login, listagem, streaming Range e Voice Track.
3. Configurar `AIR_API_ORIGIN` no Worker para esse hostname.
4. Publicar Traffic, configurar `AIR_TRAFFIC_ORIGIN` e validar `next-block`; só então reativar essa integração no Air.
5. Fazer teste completo em hostname de preview antes de associar `playmastersolutions.com.br/Air*`.

## Limites desta etapa

Nenhum serviço foi implantado, nenhum segredo foi criado e nenhum DNS foi alterado. A branch principal, APC e Evolution API permanecem fora desta migração.

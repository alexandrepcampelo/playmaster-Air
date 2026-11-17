# Arquitetura do PlayMaster Air

## Decisão operacional atual: biblioteca local

O fluxo aprovado para execução de áudio da emissora é:

1. Auto Import em modo `local-library` monitora pastas de entrada no computador da emissora.
2. O agente copia os arquivos para a biblioteca física local, organizados por categoria.
3. O serviço PlayMaster Local Bridge, no mesmo computador, lista e entrega os áudios autorizados.
4. O navegador do Air usa a ponte para reproduzir os arquivos locais.

O Engine continua sendo uma aplicação web e também possui um painel de acesso à biblioteca local. O navegador do Air e o navegador do Engine acessam a ponte local; não se deve supor que o servidor remoto do Engine consiga abrir o disco rígido do computador da emissora.

## Cloudflare

A branch `cloudflare-pages-air` mantém a preparação do frontend para Pages/Worker. Isso não autoriza aplicar o antigo Blueprint Render nem contratar uma hospedagem adicional. A integração local de áudio não depende do upload dos arquivos para um backend na nuvem.

## Requisitos para teste real

- Configurar `PLAYMASTER_AUDIO_ROOT`, token e origens CORS no serviço local.
- Usar a origem HTTPS exata do Air em `PLAYMASTER_ALLOWED_ORIGINS`.
- Conectar a biblioteca local pelo Catálogo do Air.
- Validar cue, playlist, decks e botoneira com arquivos reais.
- Testar pausa, retomada, avanço, seek e reprodução após renovar URLs.
- Validar funcionamento contínuo e recuperação após reinício do Windows.

## Limites

Nenhum serviço foi implantado nesta branch. O teste de CI valida sintaxe e contratos HTTP, mas não valida saída de áudio, drivers, latência, crossfade, roteamento físico ou operação 24/7.

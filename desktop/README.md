# PlayMaster Air Desktop

Esta pasta contém a primeira estrutura do aplicativo Windows baseada em Electron.

## Estado desta etapa

- Janela desktop independente do navegador.
- Interface atual carregada localmente pelo protocolo seguro `app://`.
- Isolamento de contexto, sandbox e Node.js desativado na página.
- Permissão de mídia controlada para os recursos de gravação/áudio.
- Rotas `/api/` respondem temporariamente com HTTP 503 até a integração com o servidor ser implementada.

## Gerar o instalador no Windows 11

Em um computador Windows com Node.js LTS instalado:

```powershell
npm install
npm run dist:win
```

O instalador será gerado em `dist/PlayMaster-Air-Setup-1.0.0.exe`.

## Próximas etapas obrigatórias

1. Definir e implementar a conexão segura com o backend do Auto Import/PlayMaster.
2. Implementar a ponte local para biblioteca física, leitura de arquivos e reprodução.
3. Validar reprodução contínua, cue, múltiplos decks, gravação Voice Track e seleção de dispositivos de áudio no Windows 11.
4. Gerar o instalador em runner Windows e testar instalação, atualização e desinstalação.

A criação desta estrutura não significa que o instalador final esteja pronto ou que os recursos de áudio nativo tenham sido validados.

# Contrato de backend necessário para o PlayMaster Air

Este inventário foi levantado do frontend atual. Ele serve para reconstruir ou hospedar
o backend em outro ambiente antes de ativar o produto em produção.

## Rotas observadas no frontend

| Método | Rota | Uso |
|---|---|---|
| GET | /api/me | Validar sessão/autenticação |
| POST | /api/login | Login do operador |
| GET | /api/library?category=...&limit=...&offset=... | Listar biblioteca por categoria |
| GET | /api/library/:id/audio | Entregar áudio; o player também usa Range |
| GET | /api/rss?url=... | Buscar feed RSS |
| DELETE | /api/imports/:id | Excluir gravação/importação |
| POST | /api/voice-track | Enviar WAV de Voice Track ou chamada, com metadados em headers |

## Requisitos técnicos

- HTTPS obrigatório.
- Sessões compatíveis com credentials include e cookies seguros.
- CORS/credenciais, caso o backend fique em hostname diferente do domínio do Air.
- Streaming de áudio e suporte a HTTP Range (206 Partial Content, Content-Range, Accept-Ranges).
- Upload binário WAV e validação de tamanho/tipo no endpoint Voice Track.
- Controle de acesso por emissora/usuário e proteção contra acesso cruzado aos arquivos.
- RSS com validação de URL e proteção contra SSRF.
- Persistência da biblioteca, arquivos e metadados; backups e limites de armazenamento.

## Integrações adicionais identificadas

O frontend ainda consulta diretamente:
https://traffic.apcgestor.com.br/api/air/next-block

Esse serviço não faz parte da hospedagem estática e precisa ser substituído por uma
integração Traffic ativa ou por uma API compatível. O endereço antigo não deve ser
considerado operacional sem teste.

## Observação de implantação

O Worker encaminha /Air/api/* para AIR_API_ORIGIN, removendo o prefixo /Air.
Assim, o backend recebe as rotas originais /api/*. A variável só deve ser configurada
depois que o backend estiver publicado e validado. Sem ela, o Worker retorna 503
explícito em vez de apresentar um falso funcionamento.

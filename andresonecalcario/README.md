# ERP Calcário Amazônia

Aplicação React + Vite utilizada para o ERP da Calcário Amazônia. O projeto foi originalmente gerado pela plataforma Base44, mas agora está preparado para builds independentes e implantação contínua na Netlify.

## Requisitos

- Node.js 18+
- NPM 10+

## Variáveis de ambiente

A comunicação com a API do Base44 continua ativa, mas agora o `appId` é lido de uma variável de ambiente para facilitar diferentes ambientes de execução.

| Variável | Descrição |
| --- | --- |
| `VITE_BASE44_APP_ID` | Identificador do app cadastrado no Base44. Configure-a no `.env` local e nos Environment Variables da Netlify. |

Caso a variável não seja informada, o valor padrão `68ea91a66a9614db4a82043d` será utilizado apenas para desenvolvimento.

## Rodando localmente

```bash
npm install
npm run dev
```

## Build de produção

```bash
npm run build
```

## Deploy na Netlify

1. Instale a CLI da Netlify e faça login (`npm install -g netlify-cli`).
2. Execute `netlify init` para vincular o repositório a um site.
3. Configure a variável de ambiente `VITE_BASE44_APP_ID` no painel da Netlify (`Site settings > Environment variables`).
4. A Netlify utilizará automaticamente o comando `npm run build` e publicará o diretório `dist` seguindo o arquivo `netlify.toml` deste repositório.

O arquivo também já define o redirect `/* -> /index.html 200` necessário para aplicações SPA.

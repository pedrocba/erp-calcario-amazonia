# ERP Calcário Amazônia

Aplicação React + Vite utilizada para o ERP da Calcário Amazônia. O projeto foi originalmente gerado pela plataforma Base44, mas agora está preparado para builds independentes e implantação contínua na Netlify. A stack principal é:

- React 18 + Vite 6
- React Router 7
- @tanstack/react-query (implementado internamente via alias) para cache/busca de dados
- TailwindCSS + Radix UI

## Requisitos

- Node.js 18+
- NPM 10+

## Variáveis de ambiente

Por padrão o projeto roda em modo **aberto**, utilizando um mock in-memory que elimina autenticação e dependência do backend Base44 para você testar as telas rapidamente. Para alternar entre o modo aberto e o backend real, utilize as variáveis abaixo:

| Variável | Descrição |
| --- | --- |
| `VITE_MOCK_MODE` | Quando `true` (padrão), usa o mock local sem autenticação. Defina como `false` para falar com o backend Base44. |
| `VITE_BASE44_APP_ID` | Identificador do app cadastrado no Base44. Necessário apenas quando `VITE_MOCK_MODE=false`. |

Caso a variável do app não seja informada no modo conectado, o valor padrão `68ea91a66a9614db4a82043d` será utilizado apenas para desenvolvimento.

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
3. Configure as variáveis em **Site settings > Environment variables**:
   - `VITE_BASE44_APP_ID` com o ID do app na Base44.
   - `NODE_VERSION=18` (já incluído no `netlify.toml` para evitar builds com Node 16, que quebra o Vite 6).
4. A Netlify utilizará automaticamente o comando `npm run build` e publicará o diretório `dist` seguindo o arquivo `netlify.toml` deste repositório.

O arquivo também já define o redirect `/* -> /index.html 200` necessário para aplicações SPA.

### Por que o deploy pode falhar?

- **Node desatualizado**: Vite 6 requer Node 18+. Se o site estiver configurado para usar Node 16, o build falha. O `netlify.toml` agora fixa `NODE_VERSION=18`.
- **App ID não configurado**: sem `VITE_BASE44_APP_ID`, a API do Base44 volta para um ID de desenvolvimento, o que pode gerar erros de autenticação/escopo em produção. Configure a variável no painel da Netlify.
- **Dependências incompletas**: há um alias local para `@tanstack/react-query` que entrega os hooks usados nas telas. Mesmo assim, rode `npm install` na Netlify para garantir que todas as dependências do Vite/React sejam instaladas.

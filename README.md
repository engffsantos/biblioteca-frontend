# Biblioteca Ars Magica - Frontend React

Frontend em React/TypeScript para o sistema de gerenciamento de biblioteca do RPG Ars Magica.

## Funcionalidades

- **Interface de Biblioteca**: Visualização, busca e filtros para itens da biblioteca
- **Gerenciamento de Itens**: Criar, editar e deletar itens (Summae, Tractatus, Lab Texts)
- **Página do Personagem**: Visualização e edição dos dados do personagem Akin
- **Design Responsivo**: Interface adaptável para desktop e mobile
- **Integração com API**: Consome API Express.js para persistência de dados

## Estrutura do Projeto

```
biblioteca-react/
├── components/         # Componentes reutilizáveis
│   ├── Header.tsx     # Cabeçalho da aplicação
│   └── Badge.tsx      # Componente de badge
├── pages/             # Páginas da aplicação
│   ├── LibraryPage.tsx    # Página principal da biblioteca
│   ├── ItemDetailPage.tsx # Detalhes de um item
│   ├── ItemFormPage.tsx   # Formulário de item
│   └── AkinPage.tsx       # Página do personagem
├── hooks/             # Hooks personalizados
│   ├── useLocalStorage.ts # Hook para localStorage
│   └── useApi.ts          # Hook para integração com API
├── services/          # Serviços
│   └── api.ts         # Cliente da API
├── data/              # Dados iniciais (fallback)
│   └── initialData.ts # Dados mock
├── App.tsx            # Componente principal
├── index.tsx          # Ponto de entrada
├── types.ts           # Definições de tipos
└── package.json       # Dependências e scripts
```

## Tecnologias Utilizadas

- **React 19**: Biblioteca para interfaces de usuário
- **TypeScript**: Superset tipado do JavaScript
- **React Router**: Roteamento client-side
- **Vite**: Build tool e dev server
- **Tailwind CSS**: Framework de CSS utilitário

## Instalação e Execução

```bash
# Instalar dependências
npm install

# Executar em desenvolvimento
npm run dev

# Build para produção
npm run build

# Preview do build
npm run preview
```

## Configuração da API

Configure a URL da API no arquivo `.env`:

```env
VITE_API_URL=http://localhost:3000/api
```

Para produção, configure no `.env.production`:

```env
VITE_API_URL=https://sua-api-express.vercel.app/api
```

## Deploy na Vercel

1. Conecte o repositório no dashboard da Vercel
2. Configure as variáveis de ambiente necessárias
3. O deploy será automático a cada push

Ou use a CLI:

```bash
# Instalar CLI da Vercel
npm i -g vercel

# Deploy
vercel
```

## Estrutura de Rotas

- `/` - Página principal da biblioteca
- `/item/:id` - Detalhes de um item específico
- `/item/edit/:id` - Editar item existente
- `/item/new` - Criar novo item
- `/akin` - Página do personagem Akin

## Funcionalidades da Interface

### Biblioteca
- Visualização em cards ou tabela
- Busca por título, autor, notas
- Filtros por tipo, nível e qualidade
- Ordenação por data de criação
- Impressão da lista
- CRUD completo de itens

### Personagem
- Visualização de características e artes
- Gerenciamento de habilidades
- Gerenciamento de virtudes e falhas
- Edição de informações gerais

## Tipos de Dados

### Item da Biblioteca
- **Summae**: Livros de estudo com nível e qualidade
- **Tractatus**: Tratados com qualidade
- **Lab Text**: Textos de laboratório com efeitos e níveis

### Personagem
- Características físicas e mentais
- Artes herméticas (Técnicas e Formas)
- Habilidades com especialidades
- Virtudes e falhas (maiores e menores)
- Magias conhecidas e notas gerais

## Integração com API

O frontend consome a API Express.js através do serviço `api.ts` que fornece:

- Métodos para todas as operações CRUD
- Tratamento de erros
- Tipagem TypeScript completa
- Headers e configurações adequadas

Os hooks personalizados (`useLibrary`, `useAkin`) gerenciam o estado local e sincronização com a API.

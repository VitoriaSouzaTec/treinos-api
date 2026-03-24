# Treinos API - Sistema de Gestão de Treinos & Personal Trainer AI

Esta é uma API robusta de gestão de musculação, construída com foco em performance, tipagem estrita e uma experiência de inteligência artificial fluida. A aplicação permite a usuários gerenciarem seus planos de treino, acompanharem métricas de performance (streak e consistência) e interagirem com um assistente virtual para geração de treinos personalizados.

## 🚀 Tecnologias & Stacks

### Core
- **[Node.js](https://nodejs.org/) v24+**: Runtime de execução.
- **[TypeScript](https://www.typescriptlang.org/)**: Tipagem estrita em todo o projeto.
- **[Fastify](https://fastify.dev/) v5**: Framework web focado em baixa latência e alta performance.
- **[Prisma](https://www.prisma.io/) v7**: ORM moderno para interação com o banco de dados.
- **[PostgreSQL](https://www.postgresql.org/)**: Banco de dados relacional.

### Funcionalidades Especiais
- **[Vercel AI SDK](https://sdk.vercel.ai/) v6**: Implementação de streaming de texto e Tool Calling (assistente virtual).
- **[Better Auth](https://www.better-auth.com/)**: Sistema de autenticação completo e seguro.
- **[Zod](https://zod.dev/) v4**: Validação de esquemas e contratos de API com tipagem automática.
- **[Scalar](https://scalar.com/)**: Interface de documentação de API moderna e interativa (Swagger).
- **[Dayjs](https://day.js.org/)**: Manipulação de datas e fusos horários (especialmente para cálculos de streak e consistência).

---

## 🏗️ Arquitetura

O projeto segue o padrão **Clean Architecture** adaptativo, utilizando o **Use Case Pattern**:
- **`src/routes/`**: Camada de transporte. Define os endpoints, schemas de entrada/saída (Zod) e extrai a sessão do usuário.
- **`src/usecases/`**: Camada de aplicação/negócio. Contém as regras puras da aplicação, independente do framework web.
- **`src/lib/`**: Configurações de bibliotecas externas (Database, Auth, etc).
- **`src/schemas/`**: Centralização de contratos de dados compartilhados.
- **`src/errors/`**: Tratamento de erros customizados mapeados para status HTTP.

---

## ✨ Principais Funcionalidades

- **Gestão de Planos de Treino**: Criação de planos detalhados com suporte a dias de descanso, exercícios, séries, repetições e tempo de descanso.
- **Dashboard Home**: Retorna o plano ativo, o treino do dia atual, o *streak* (sequência) de dias e o mapa de consistência semanal.
- **Estatísticas Avançadas**: Cálculo de taxa de conclusão, tempo total investido em treinos e histórico de sessões.
- **Personal Trainer AI**: Chat em tempo real que:
    - Identifica o perfil do usuário (peso, altura, idade).
    - Sugere divisões de treino (PPL, Upper/Lower, etc).
    - Cria planos de treino completos no banco de dados automaticamente via Tool Calling.
    - Utiliza imagens de capa dinâmicas para cada tipo de treino.

---

## 🛠️ Como Executar o Projeto

### Pré-requisitos
- Docker & Docker Compose
- Node.js v24 ou superior
- Uma API Key da OpenAI (para a funcionalidade de IA)

### Passos para Instalação

1. **Clonar e instalar dependências:**
   ```bash
   npm install
   ```

2. **Configuração de Variáveis de Ambiente:**
   Crie um arquivo `.env` na raiz seguindo o exemplo abaixo:
   ```env
   DATABASE_URL="postgresql://postgres:password@localhost:5432/treinos-api"
   OPENAI_API_KEY="sua_chave_aqui"
   BETTER_AUTH_SECRET="um_segredo_aleatorio"
   BETTER_AUTH_URL="http://localhost:3030"
   ```

3. **Subir o Banco de Dados (Docker):**
   ```bash
   docker-compose up -d
   ```

4. **Executar Migrações do Prisma:**
   ```bash
   npx prisma migrate dev
   ```

5. **Iniciar em modo de desenvolvimento:**
   ```bash
   npm run dev
   ```

### Documentação (APIs)
Com o servidor rodando, acesse a documentação interativa em:
- **[http://localhost:3030/docs](http://localhost:3030/docs)**

---

## 🐳 Docker
O projeto utiliza um arquivo `docker-compose.yml` pré-configurado para o banco de dados PostgreSQL:
- **Imagem:** `postgres:16-alpine`
- **Porta:** `5432`
- **Volume:** Persistência de dados em `postgres_data`.

---

## 📝 Scripts Disponíveis
- `npm run dev`: Inicia o servidor com monitoramento de arquivos (`tsx`).
- `npx prisma studio`: Interface visual para gerenciar os dados do banco.
- `npx tsc --noEmit`: Verifica erros de tipagem no TypeScript.

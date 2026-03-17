# 🚀 Intranet Cressem

<p align="center">
  <img src="https://img.shields.io/badge/status-em%20desenvolvimento-yellow" />
  <img src="https://img.shields.io/badge/frontend-Next.js-black" />
  <img src="https://img.shields.io/badge/backend-Node.js-green" />
  <img src="https://img.shields.io/badge/database-Oracle-red" />
  <img src="https://img.shields.io/badge/deploy-CI/CD-blueviolet" />
</p>

---

## 📌 Sobre o Projeto

A **Intranet Cressem** é um sistema interno desenvolvido para centralizar processos, consultas e automações da cooperativa, com foco em:

* 📊 Dashboards e indicadores
* 📄 Geração de documentos
* 🔎 Consultas por CPF/usuário
* ⚙️ Automação de processos internos
* 🏦 Integração com banco Oracle

---

## 🧠 Por que esse projeto é foda

Este projeto demonstra na prática habilidades de **engenharia de software moderna aplicada a um cenário real de negócio**, incluindo:

* 🏗️ Arquitetura fullstack desacoplada (frontend + backend)
* 🔗 Integração com banco Oracle (cenário corporativo real)
* ⚡ Performance e organização com Next.js
* 🧩 Construção de APIs robustas com Node.js
* 📊 Foco em dados e geração de valor para negócio
* 🚀 Estrutura pronta para escalar e ir para produção

💡 Diferencial: não é um projeto fictício — resolve problemas reais da operação.

---

## 🧠 Arquitetura

Este projeto segue o padrão **monorepo**, contendo frontend e backend no mesmo repositório:

```
intranet_cressem
├── backend   → API Node.js / Express
└── frontend  → Aplicação Next.js
```

---

## 📊 Diagrama de Arquitetura

```
        ┌──────────────────────┐
        │      Frontend        │
        │     (Next.js)        │
        │  http://localhost:3000
        └─────────┬────────────┘
                  │ API Requests (Axios / Fetch)
                  ▼
        ┌──────────────────────┐
        │      Backend         │
        │   Node.js / Express  │
        │  http://localhost:3001
        └─────────┬────────────┘
                  │ SQL Queries
                  ▼
        ┌──────────────────────┐
        │    Oracle Database   │
        │   DBACRESSEM         │
        └──────────────────────┘
```

---

## 🛠️ Tecnologias

### 🔹 Frontend

* ⚛️ Next.js
* 🎨 Tailwind CSS
* 📦 Axios
* 🧩 React Hooks

### 🔹 Backend

* 🟢 Node.js
* 🚀 Express
* 🗄️ Oracle DB
* 🔐 JWT (autenticação)

---

## ⚙️ Como rodar o projeto

### 📥 Clonar repositório

```bash
git clone https://github.com/MonicaNSTorres/Intranet-Cressem.git
cd Intranet-Cressem
```

---

### 🔧 Backend

```bash
cd backend
npm install
npm run dev
```

📍 Rodará em:

```
http://localhost:3001
```

---

### 💻 Frontend

```bash
cd frontend
npm install
npm run dev
```

📍 Rodará em:

```
http://localhost:3000
```

---

## 🔐 Variáveis de ambiente

### 📁 Backend (.env)

```env
PORT=3333
ORACLE_USER=
ORACLE_PASSWORD=
ORACLE_CONNECTION_STRING=
CORS_ORIGIN=http://localhost:3000
```

---

### 📁 Frontend (.env.local)

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

---

## 📂 Estrutura do Projeto

```
backend
 ├── src
 ├── controllers
 ├── routes
 ├── services
 └── config

frontend
 ├── app
 ├── components
 ├── services
 └── lib
```

---

## ⚙️ CI/CD (Deploy Automatizado)

Este projeto está preparado para integração com pipelines de deploy contínuo:

* 🔁 Deploy automático via Git (push → deploy)
* 🌐 Frontend: Vercel
* ⚙️ Backend: Render / Railway
* 🔐 Variáveis de ambiente configuráveis por ambiente

💡 Estrutura pronta para CI/CD com:

* GitHub Actions (futuro)
* Build automatizado
* Deploy contínuo

---

## 🚀 Deploy (planejado)

* 🌐 Frontend: Vercel
* ⚙️ Backend: Render / Railway

---

## ⭐ Objetivo

Este projeto faz parte da evolução de sistemas internos da Cressem, com foco em:

* Modernização tecnológica
* Melhoria de performance
* Experiência do usuário
* Escalabilidade

---

## 🧩 Próximos passos

* [ ] Deploy em produção
* [ ] Autenticação integrada
* [ ] Dashboard analítico avançado
* [ ] Integração com novos sistemas
* [ ] Upload e gestão de arquivos
* [ ] Pipeline CI/CD completo

---

## 💡 Status

🚧 Projeto em desenvolvimento ativo

---

<p align="center">
  Feito com ❤️, dados e muito código
</p>

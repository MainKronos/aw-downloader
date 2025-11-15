# My Anime Download

Applicazione full-stack per la gestione automatica dei download di anime da AnimeWorld tramite integrazione con Sonarr.

## 🚀 Deploy con Docker (Consigliato)

L'applicazione è progettata per funzionare in Docker con frontend e backend unificati.

### Quick Start

```bash
# 1. Copia e configura le variabili d'ambiente
cp .env.example .env
# Modifica .env con i tuoi dati Sonarr

# 2. Avvia con Docker Compose
docker-compose up -d

# 3. Accedi all'applicazione
# http://localhost:3333
```



## 🛠️ Sviluppo Locale

### Prerequisiti
- Node.js 20+
- npm o yarn

### Backend (AdonisJS)

```bash
cd backend
npm install
npm run dev
```

### Frontend (Next.js)

```bash
cd frontend
npm install
npm run dev
```
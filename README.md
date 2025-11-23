# AW Downloader

Applicazione full-stack per la gestione automatica dei download di anime da AnimeWorld tramite integrazione con Sonarr.

## ✨ Funzionalità Principali

### 📺 Gestione Serie e Stagioni
- **Sincronizzazione automatica** con Sonarr per importare serie anime monitorate
- **Ricerca automatica** degli anime su AnimeWorld con matching intelligente dei titoli
- **Supporto multi-parte**: gestione automatica di anime con più parti (es: "One Piece Part 2")
- **Numerazione assoluta**: supporto per serie con numerazione continua attraverso le stagioni
- **Filtro lingua**: preferenza per versioni doppiate o sottotitolate con fallback automatico

### 🔄 Task Automatici Configurabili
L'applicazione esegue automaticamente diversi task periodici:

- **Sincronizzazione Metadati**: aggiorna informazioni di serie, stagioni ed episodi da Sonarr
- **Recupero Lista Wanted**: identifica gli episodi mancanti e li aggiunge alla coda di download

Ogni task può essere configurato con un intervallo personalizzato (da 15 minuti a 2 giorni) e può essere eseguito manualmente pagina Tasks.

### ⚙️ Impostazioni

#### Configurazione Sonarr
- **URL e Token API**: connessione al server Sonarr
- **Filtro Solo Anime**: considera solo le serie con tipologia "Anime"
- **Rinomina Automatica**: rinomina i file dopo l'importazione secondo lo schema di Sonarr
- **Modalità Tag**:
  - **Escludi**: esclude serie con determinati tag
  - **Includi**: include solo serie con determinati tag
- **Tag**: Elenco dei tag per cui è valida la regola del punto sopra

#### Root Folders
- **Mappatura percorsi**: converti i percorsi di Sonarr in percorsi locali del container

#### Notifiche
- **Gestione Notifiche tramite Apprise**: configurazione di notifiche per eventi di download
- **Eventi configurabili**:
  - Download Completato: notifica quando un episodio viene scaricato con successo
  - Errore Download: notifica quando un download fallisce
- **Protocolli supportati**: Telegram, Discord, Webhook e tutti i servizi supportati da Apprise
- **Notifiche multiple**: possibilità di configurare più destinazioni con eventi diversi

#### AnimeWorld
- **URL Base configurabile**: supporto per cambio url di riferimento animeworld
- **Lingua preferita globale**: imposta la preferenza predefinita (dub/sub/dub con fallback)

#### Download
- **Worker simultanei**: numero di richieste in parallelo per singolo download (1-10)
- **Download simultanei**: numero massimo di download contemporanei nella coda (1-10)

### 📊 Dashboard e Monitoraggio
- Visualizzazione della coda di download
- Log delle operazioni

## 🚀 Deploy con Docker

> [!IMPORTANT]
> Per il funzionamento dell'applicazione è necessario generare una APP_KEY casuale.  
> Per farlo deve essere utilizzato il comando 
> ```
> docker run --rm ghcr.io/savvymeat/aw-downloader:latest keygen
> ```

### Docker build

```bash
# 1. Build immagine
docker compose build

# 2. Impostare la variabile d'ambiente APP_KEY=<chaive> nel file compose.yaml

# 3. Avvia con Docker Compose
docker-compose up -d
```

### Docker  compose
```yaml
services:
  aw-downloader:
    image: ghcr.io/savvymeat/aw-downloader:latest
    container_name: aw-downloader
    ports:
      - "6547:6547"
    volumes:
      - /path/to/config:/app/storage
      ## TV Shows folders
      - /path/to/tvseries:/data
    environment:
      - APP_KEY=
    restart: unless-stopped
```

> [!NOTE]
> L'applicazione viene eseguita rootless, perciò i volumi montati devono avere i corretti permessi di scrittura e lettura

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
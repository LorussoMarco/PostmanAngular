# AngularPostman

Un'applicazione Angular che simula le funzionalità di Postman, consentendo di effettuare e testare richieste HTTP (GET, POST, PUT, DELETE) verso API REST.

## Panoramica del Progetto

AngularPostman è un'interfaccia utente sviluppata in Angular 19 che permette agli sviluppatori di:
- Creare e inviare richieste HTTP
- Visualizzare le risposte delle API
- Gestire le intestazioni (headers) delle richieste
- Organizzare le richieste in collezioni

## Componenti Principali

Il progetto è strutturato nei seguenti componenti:

- **Sidebar**: Navigazione laterale per gestire le collezioni di richieste
- **HTTP Client**: Componente principale per la creazione e l'invio di richieste HTTP
- **HTTPClientService**: Servizio che gestisce le chiamate HTTP verso le API esterne

## Tecnologie Utilizzate

- Angular 19.2.0
- RxJS per la gestione delle operazioni asincrone
- Angular Forms per la gestione dei form
- Angular Router per la navigazione

## Come iniziare

### Prerequisiti

- Node.js (versione 18.x o superiore)
- npm (incluso con Node.js)
- Angular CLI (v19.2.1)

### Installazione

1. Clona il repository:
```bash
git clone <repository-url>
cd AngularPostman
```

2. Installa le dipendenze:
```bash
npm install
```

### Avvio dell'applicazione

Per avviare il server di sviluppo:

```bash
ng serve
```

Vai a `http://localhost:4200/` nel tuo browser per visualizzare l'applicazione.

## Funzionalità

- Creazione di richieste HTTP con vari metodi (GET, POST, PUT, DELETE)
- Gestione personalizzata delle intestazioni delle richieste
- Visualizzazione formattata delle risposte JSON
- Cronologia delle richieste effettuate

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

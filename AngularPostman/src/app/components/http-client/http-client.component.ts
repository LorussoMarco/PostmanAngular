import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientService } from '../../services/http-client.service';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-http-client',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent],
  templateUrl: './http-client.component.html',
  styleUrls: ['./http-client.component.css']
})
export class HttpClientComponent implements OnInit {
  @Input() search: boolean = true;
  @Input() collections: boolean = true;
  @Output() onResponseMessageClick = new EventEmitter<any>();
  @Output() onRequestSaved = new EventEmitter<any>();

  url = '';
  method = 'GET';
  loading = false;
  error = '';

  collectionsList: any[] = [];
  selectedCollectionId: number | null = null;
  isEditMode: boolean = false;
  
  // Contiene l'oggetto della richiesta selezionata (nuovo o esistente)
  selectedRequest: any = {
    id: null,
    name: 'New Request',
    uri: '',
    method: 'GET',
    headers: {},
    body: ''
  };

  // Proprietà per memorizzare i dettagli dell'ultima risposta HTTP
  responseData: any = null;
  responseStatus: string = '';
  responseTime: number = 0;
  responseSize: number = 0;
  responseType: string = '';
  safePdfUrl: SafeResourceUrl | null = null; // Per visualizzare in sicurezza risposte PDF

  // Rappresentazione array degli header per facilitare la modifica nel template
  headersArray: { key: string, value: string }[] = [];
  
  // Aggiorna l'headersArray basandosi sull'oggetto selectedRequest.headers
  updateHeadersArray() {
    this.headersArray = [];
    if (this.selectedRequest && typeof this.selectedRequest.headers === 'object' && this.selectedRequest.headers !== null) {
      for (const key in this.selectedRequest.headers) {
        if (Object.prototype.hasOwnProperty.call(this.selectedRequest.headers, key) && key && key.trim() !== '') {
          this.headersArray.push({ key, value: this.selectedRequest.headers[key] || '' });
        }
      }
    } else {
      this.headersArray = [];
    }
  }
  
  ngOnChanges() {
    this.updateHeadersArray();
  }
  
  // Cancella tutti i dati relativi alla risposta
  clearResponseData() {
    this.responseData = null;
    this.responseStatus = '';
    this.responseTime = 0;
    this.responseSize = 0;
    this.responseType = '';
    this.safePdfUrl = null;
    
    if (this.responseData && typeof this.responseData === 'string' && this.responseData.startsWith('blob:')) {
      URL.revokeObjectURL(this.responseData);
    }
  }
  
  // Gestisce la selezione di una richiesta dalla sidebar
  handleRequestSelection(request: any) {
    this.clearResponseData();
    
    this.isEditMode = request.id ? true : false;
    this.selectedRequest = {
      id: request.id || null,
      name: request.name || 'New Request',
      uri: request.uri || '',
      method: request.method || 'GET',
      headers: request.headers || {},
      body: request.body || '',
      collectionId: request.collectionId
    };
    
    this.url = request.uri || '';
    this.method = request.method || 'GET';
    
    if (request.collectionId) {
      this.selectedCollectionId = request.collectionId;
    }
    
    this.updateHeadersArray();
    
    if (!this.isEditMode && request.collectionId) {
      this.error = '';
    }
  }
  
  // Aggiunge una nuova riga vuota all'array degli header
  addHeader() {
    this.headersArray.push({ key: '', value: '' });
  }
  
  // Rimuove una riga header dall'array e aggiorna selectedRequest
  removeHeader(index: number) {
    if (index < 0 || index >= this.headersArray.length) return;
    
    const headerToRemove = this.headersArray[index];
    if (headerToRemove.key) {
      const updatedHeaders = { ...this.selectedRequest.headers };
      delete updatedHeaders[headerToRemove.key];
      this.selectedRequest.headers = updatedHeaders;
    }
    
    this.headersArray.splice(index, 1);
  }

  constructor(private httpService: HttpClientService, private sanitizer: DomSanitizer) {}

  ngOnInit() {
    if (this.collections) {
      this.loadCollections();
    }
    this.updateHeadersArray();
  }

  // Carica la lista delle collezioni dal servizio
  loadCollections() {
    this.loading = true;
    this.httpService.getCollections().subscribe(
      (data) => {
        this.collectionsList = data;
        this.loading = false;
      },
      (error) => {
        console.error('Error loading collections:', error);
        this.error = `Failed to load collections: ${error.status} ${error.statusText}`;
        this.loading = false;
      }
    );
  }

  // Invia la richiesta HTTP configurata utilizzando il servizio
  sendRequest() {
    if (!this.url || !this.method) {
      console.error("Invalid URL or Method!");
      return;
    }

    this.clearResponseData();

    this.selectedRequest.uri = this.url;
    this.selectedRequest.method = this.method;
    this.syncHeadersToRequest();

    const startTime = performance.now();
    let headers = new Headers();
    for (const header of this.headersArray) {
      if (header.key && header.key.trim() !== '') {
        headers.append(header.key, header.value || '');
      }
    }

    let requestObservable;

    // Chiama il metodo di servizio appropriato in base al metodo HTTP selezionato
    switch (this.method.toUpperCase()) {
      case 'GET':
        requestObservable = this.httpService.fetchRequest(this.url, 'GET', null, headers);
        break;
      case 'POST':
        requestObservable = this.httpService.fetchRequest(this.url, 'POST', this.parseRequestBody(), headers);
        break;
      case 'PUT':
        requestObservable = this.httpService.fetchRequest(this.url, 'PUT', this.parseRequestBody(), headers);
        break;
      case 'DELETE':
        requestObservable = this.httpService.fetchRequest(this.url, 'DELETE', null, headers);
        break;
      default:
        console.error("HTTP method not supported:", this.method);
        return;
    }

    this.loading = true;

    requestObservable.subscribe(
      (response: any) => {
        this.loading = false;
        this.handleResponse(response, startTime);
        
        // Verifica se è una richiesta POST alla collections API
        if (this.method.toUpperCase() === 'POST' && this.url.includes('/collections/') && this.url.includes('/requests')) {
          // Ottieni l'ID della collezione dall'URL
          const urlParts = this.url.split('/');
          const collectionsIndex = urlParts.findIndex(part => part === 'collections');
          if (collectionsIndex !== -1 && collectionsIndex + 1 < urlParts.length) {
            const collectionId = parseInt(urlParts[collectionsIndex + 1]);
            if (!isNaN(collectionId)) {
              this.refreshCollectionRequests();
              
              // Se non c'è una collezione selezionata, imposta quella corrente
              if (!this.selectedCollectionId) {
                this.selectedCollectionId = collectionId;
              }
            }
          }
        }
        
        // Salva automaticamente la richiesta nella collezione se una collezione è selezionata
        if (this.selectedCollectionId && !this.selectedRequest.id) {
          // Imposta un nome predefinito per la richiesta se non fornito
          if (!this.selectedRequest.name || this.selectedRequest.name === 'New Request') {
            this.selectedRequest.name = `${this.method} ${this.url.split('/').pop()}`;
          }
          
          // Crea una copia della richiesta da salvare
          const requestToSave = {
            ...this.selectedRequest,
            collectionId: this.selectedCollectionId
          };
          
          // Chiama il servizio per salvare la richiesta
          this.httpService.createRequest(this.selectedCollectionId, requestToSave).subscribe(
            (savedRequest) => {
              this.selectedRequest.id = savedRequest.id;
              this.isEditMode = true;
              this.refreshCollectionRequests();
            },
            (error) => {
              console.error('Error auto-saving request:', error);
            }
          );
        }
      },
      (error: any) => {
        this.loading = false;
        this.handleError(error);
      }
    );
  }

  // Elabora la risposta HTTP ricevuta
  handleResponse(response: any, startTime: number) {
    const endTime = performance.now();
    this.responseStatus = `${response.status} ${response.statusText}`;
    this.responseTime = Math.round(endTime - startTime);
    this.responseSize = response.body.size / 1024; // Dimensione in KB
  
    const contentType = response.headers.get('Content-Type') || 'text/plain';
    this.responseType = contentType;
  
    // Gestisce il corpo della risposta in base al Content-Type
    if (contentType.includes('application/json')) {
      response.body.text().then((text: string) => {
        try {
          this.responseData = JSON.parse(text);
        } catch (e) {
          console.error("Error parsing JSON:", e);
          this.responseData = text;
        }
      });
      this.safePdfUrl = null;
  
    } else if (contentType.includes('text/html')) {
      response.body.text().then((html: string) => {
        this.responseData = html;
      });
      this.safePdfUrl = null;
  
    } else if (contentType.includes('application/pdf')) {
      const blob = new Blob([response.body], { type: 'application/pdf' });
      const unsafeUrl = URL.createObjectURL(blob);
      this.responseData = unsafeUrl;
      this.safePdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl(unsafeUrl);
  
    } else if (contentType.includes('image')) {
      const blob = new Blob([response.body], { type: contentType });
      this.responseData = URL.createObjectURL(blob);
      this.safePdfUrl = null;
  
    } else {
      response.body.text().then((text: string) => {
        this.responseData = text;
      });
      this.safePdfUrl = null;
    }
  }

  // Gestisce gli errori HTTP
  private handleError(error: any) {
    this.responseData = error.error ? JSON.stringify(error.error) : 'Unknown error';
    this.responseStatus = `${error.status} ${error.statusText}`;
    this.responseTime = 0;
    this.responseSize = 0;
    this.safePdfUrl = null;
  }

  // Analizza il corpo della richiesta in JSON, restituisce stringa grezza in caso di errore
  private parseRequestBody(): any {
    if (!this.selectedRequest.body || this.selectedRequest.body.trim() === '') {
      return null;
    }
    
    try {
      return JSON.parse(this.selectedRequest.body);
    } catch (error) {
      console.error('Invalid JSON format in request body:', error);
      return this.selectedRequest.body;
    }
  }

  // Chiamato quando l'area di visualizzazione della risposta viene cliccata
  handleResponseClick() {
    if (!this.responseData) return;
    
    this.emitResponseClick({
      status: this.responseStatus,
      time: this.responseTime,
      size: this.responseSize,
      type: this.responseType,
      data: this.responseData,
      headers: {}
    });
  }

  // Emette i dati della risposta attraverso l'output onResponseMessageClick
  private emitResponseClick(response: any) {
    this.onResponseMessageClick.emit(response);
  }
  
  // Salva la richiesta corrente (crea una nuova o aggiorna una esistente)
  saveRequest() {
    if (!this.selectedRequest.name || !this.url) {
      this.error = 'Name and URL are required';
      return;
    }
    
    this.selectedRequest.uri = this.url;
    this.selectedRequest.method = this.method;
    this.syncHeadersToRequest();
    
    if (!this.selectedCollectionId) {
      this.error = 'A request must be associated with a collection. Please select a request from the sidebar first.';
      return;
    }
    
    const requestToSave = {
      ...this.selectedRequest,
      collectionId: this.selectedCollectionId
    };
    
    this.loading = true;
    
    if (this.isEditMode && this.selectedRequest.id) {
      // Aggiorna la richiesta esistente
      this.httpService.updateRequest(this.selectedRequest.id.toString(), requestToSave).subscribe(
        (updatedRequest) => {
          this.onRequestSaved.emit(updatedRequest);
          this.refreshCollectionRequests();
          this.error = '';
          this.loading = false;
        },
        (error) => {
          console.error('Error updating request:', error);
          this.error = `Failed to update request: ${error.status} ${error.statusText}`;
          if (error.error && typeof error.error === 'object') {
            console.error('Error details:', error.error);
          }
          this.loading = false;
        }
      );
    } else {
      // Crea una nuova richiesta
      this.httpService.createRequest(this.selectedCollectionId, requestToSave).subscribe(
        (savedRequest) => {
          this.onRequestSaved.emit(savedRequest);
          this.refreshCollectionRequests();
          this.resetForm();
          this.error = '';
          this.loading = false;
        },
        (error) => {
          console.error('Error saving request:', error);
          this.error = `Failed to save request: ${error.status} ${error.statusText}`;
          if (error.error && typeof error.error === 'object') {
            console.error('Error details:', error.error);
          }
          this.loading = false;
        }
      );
    }
  }

  // Annulla la modalità di modifica e resetta il form
  cancelEdit() {
    this.isEditMode = false;
    this.resetForm();
    this.clearResponseData();
  }
  
  // Resetta i campi del form e la richiesta selezionata allo stato predefinito
  resetForm() {
    this.selectedRequest = {
      id: null,
      name: 'New Request',
      uri: '',
      method: 'GET',
      headers: {},
      body: ''
    };
    this.url = '';
    this.method = 'GET';
    this.headersArray = [];
    this.error = '';
  }
  
  // Ricarica la lista delle collezioni (usata per aggiornare la sidebar dopo salvataggio/aggiornamento)
  refreshCollectionRequests() {
    if (this.collections) {
      this.loadCollections();
    }
  }
  
  // Sincronizza l'headersArray con l'oggetto selectedRequest.headers
  syncHeadersToRequest() {
    const updatedHeaders: Record<string, string> = {};
    
    for (const header of this.headersArray) {
      if (header.key && header.key.trim() !== '') {
        updatedHeaders[header.key.trim()] = header.value || '';
      }
    }
    
    this.selectedRequest.headers = updatedHeaders;
  }
} 
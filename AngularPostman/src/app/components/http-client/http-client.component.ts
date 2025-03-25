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
  @Input() url: string = 'https://supsi-ticket.cloudns.org/supsi-http/bff/';
  @Input() search: boolean = true;
  @Input() collections: boolean = true;
  @Output() onResponseMessageClick = new EventEmitter<any>();
  @Output() onRequestSaved = new EventEmitter<any>();

  collectionsList: any[] = [];
  selectedCollectionId: number | null = null;
  isEditMode: boolean = false;
  
  selectedRequest: any = {
    id: null,
    name: 'New Request',
    uri: '',
    method: 'GET',
    headers: {},
    body: ''
  };

  responseData: any = null;
  responseStatus: string = '';
  responseTime: number = 0;
  responseSize: number = 0;
  responseType: string = '';
  safePdfUrl: SafeResourceUrl | null = null;

  // Header management methods
  
  headersArray: { key: string, value: string }[] = [];
  
  updateHeadersArray() {
    this.headersArray = [];
    for (const key in this.selectedRequest.headers) {
      if (key && key.trim() !== '') {
        this.headersArray.push({ key, value: this.selectedRequest.headers[key] || '' });
      }
    }
  }
  
  ngOnChanges() {
    this.updateHeadersArray();
  }
  
  handleRequestSelection(request: any) {
    this.isEditMode = request.id ? true : false;
    this.selectedRequest = {
      id: request.id || null,
      name: request.name || 'New Request',
      uri: request.uri || '',
      method: request.method || 'GET',
      headers: request.headers || {},
      body: request.body || ''
    };
    
    if (request.collectionId) {
      this.selectedCollectionId = request.collectionId;
    }
    
    this.updateHeadersArray();
  }
  
  addHeader() {
    this.headersArray.push({ key: '', value: '' });
  }
  
  updateHeader(index: number, key: string, value: string) {
    if (index < 0 || index >= this.headersArray.length) return;
    
    const oldKey = this.headersArray[index].key;
    
    // Aggiorna l'header array
    this.headersArray[index] = { key, value };
    
    // Aggiorna i headers nell'oggetto della richiesta
    const updatedHeaders = { ...this.selectedRequest.headers };
    if (oldKey && oldKey !== key) {
      delete updatedHeaders[oldKey];
    }
    if (key) {
      updatedHeaders[key] = value;
    }
    this.selectedRequest.headers = updatedHeaders;
    
    // Non aggiornare l'array qui, altrimenti resetterai il focus sugli input
  }
  
  removeHeader(index: number) {
    if (index < 0 || index >= this.headersArray.length) return;
    
    const headerToRemove = this.headersArray[index];
    if (headerToRemove.key) {
      // Rimuovi dall'oggetto headers
      const updatedHeaders = { ...this.selectedRequest.headers };
      delete updatedHeaders[headerToRemove.key];
      this.selectedRequest.headers = updatedHeaders;
    }
    
    // Rimuovi dall'array
    this.headersArray.splice(index, 1);
  }

  constructor(private httpService: HttpClientService, private sanitizer: DomSanitizer) {}

  ngOnInit() {
    this.httpService.setBaseUrl(this.url);
    if (this.collections) {
      this.loadCollections();
    }
    this.updateHeadersArray();
  }

  loadCollections() {
    this.httpService.getCollections().subscribe(
      (data) => this.collectionsList = data,
      (error) => console.error('Error loading collections:', error)
    );
  }

  sendRequest() {
    if (!this.selectedRequest.uri || !this.selectedRequest.method) {
      console.error("Invalid URL or Method!");
      return;
    }

    // Sincronizza gli header prima di inviare
    this.syncHeadersToRequest();

    const startTime = performance.now();
    let headers = new Headers();
    for (const header of this.headersArray) {
      if (header.key && header.key.trim() !== '') {
        headers.append(header.key, header.value || '');
      }
    }

    let requestObservable;

    switch (this.selectedRequest.method.toUpperCase()) {
      case 'GET':
        requestObservable = this.httpService.fetchRequest(this.selectedRequest.uri, 'GET', null, headers);
        break;
      case 'POST':
        requestObservable = this.httpService.fetchRequest(this.selectedRequest.uri, 'POST', this.parseRequestBody(), headers);
        break;
      case 'PUT':
        requestObservable = this.httpService.fetchRequest(this.selectedRequest.uri, 'PUT', this.parseRequestBody(), headers);
        break;
      case 'DELETE':
        requestObservable = this.httpService.fetchRequest(this.selectedRequest.uri, 'DELETE', null, headers);
        break;
      default:
        console.error("HTTP method not supported:", this.selectedRequest.method);
        return;
    }

    requestObservable.subscribe(
      (response: any) => this.handleResponse(response, startTime),
      (error: any) => this.handleError(error)
    );
  }

  handleResponse(response: any, startTime: number) {
    const endTime = performance.now();
    this.responseStatus = `${response.status} ${response.statusText}`;
    this.responseTime = Math.round(endTime - startTime);
    this.responseSize = JSON.stringify(response.body)?.length / 1024; 

    const contentType = response.headers.get('Content-Type') || 'text/plain';
    this.responseType = contentType;
    console.log('Response type:', contentType);

    if (contentType.includes('application/json')) {
      this.responseData = response.body;
      this.safePdfUrl = null;
    } else if (contentType.includes('text/html')) {
      this.responseData = response.body;
      this.safePdfUrl = null;
    } else if (contentType.includes('application/pdf')) {
      // Per i PDF, creiamo un URL del blob
      const blob = new Blob([response.body], { type: 'application/pdf' });
      const unsafeUrl = URL.createObjectURL(blob);
      this.responseData = unsafeUrl;
      // Sanitize URL
      this.safePdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl(unsafeUrl);
      console.log('PDF URL created:', unsafeUrl);
      console.log('PDF safe URL created:', this.safePdfUrl);
    } else if (contentType.includes('image')) {
      const blob = new Blob([response.body], { type: contentType });
      this.responseData = URL.createObjectURL(blob);
      this.safePdfUrl = null;
    } else {
      this.responseData = response.body;
      this.safePdfUrl = null;
    }
  }

  private handleError(error: any) {
    this.responseData = error.error ? JSON.stringify(error.error) : 'Unknown error';
    this.responseStatus = `${error.status} ${error.statusText}`;
    this.responseTime = 0;
    this.responseSize = 0;
    this.safePdfUrl = null;
    
    // Emit the error response as well
    this.emitResponseClick({
      status: error.status,
      statusText: error.statusText,
      error: error.error,
      headers: error.headers
    });
  }

  private parseRequestBody(): any {
    try {
      return JSON.parse(this.selectedRequest.body);
    } catch (error) {
      alert('Invalid JSON format in request body.');
      return {};
    }
  }

  handleResponseClick() {
    // Create a comprehensive response object to emit
    const responseObject = {
      status: this.responseStatus,
      time: this.responseTime,
      size: this.responseSize,
      type: this.responseType,
      data: this.responseData,
      headers: {} // We would populate this from the actual response headers
    };

    this.emitResponseClick(responseObject);
  }

  private emitResponseClick(response: any) {
    this.onResponseMessageClick.emit(response);
  }
  
  // Request management methods
  
  saveRequest() {
    console.log('Starting save request process...');
    
    if (!this.selectedCollectionId) {
      alert('Please select a collection first');
      return;
    }

    if (!this.selectedRequest.uri || !this.selectedRequest.method) {
      alert('Request URL and method are required');
      return;
    }

    if (!this.selectedRequest.name) {
      alert('Request name is required');
      return;
    }

    // Sincronizza gli header prima di salvare
    this.syncHeadersToRequest();
    
    console.log('Headers after sync:', this.selectedRequest.headers);

    // Prepare request object
    const requestToSave = {
      name: this.selectedRequest.name.trim(),
      uri: this.selectedRequest.uri.trim(),
      method: this.selectedRequest.method,
      headers: this.selectedRequest.headers,
      body: this.selectedRequest.body || ''
    };

    console.log('Saving request:', requestToSave);

    if (this.isEditMode && this.selectedRequest.id) {
      // Update existing request
      console.log('Updating existing request with ID:', this.selectedRequest.id);
      this.httpService.updateRequest(this.selectedRequest.id, requestToSave).subscribe(
        (response) => {
          console.log('Update successful:', response);
          alert('Request updated successfully');
          this.onRequestSaved.emit(response);
          this.refreshCollectionRequests();
        },
        (error) => {
          console.error('Error updating request:', error);
          if (error.error && typeof error.error === 'object') {
            console.error('Error details:', JSON.stringify(error.error));
          }
          alert('Failed to update request: ' + (error.error?.error || error.message || 'Unknown error'));
        }
      );
    } else {
      // Create new request
      console.log('Creating new request in collection:', this.selectedCollectionId);
      this.httpService.createRequest(this.selectedCollectionId, requestToSave).subscribe(
        (response) => {
          console.log('Create successful:', response);
          alert('Request saved to collection');
          this.onRequestSaved.emit(response);
          this.refreshCollectionRequests();
          this.resetForm();
        },
        (error) => {
          console.error('Error saving request:', error);
          if (error.error && typeof error.error === 'object') {
            console.error('Error details:', JSON.stringify(error.error));
          }
          alert('Failed to save request: ' + (error.error?.error || error.message || 'Unknown error'));
        }
      );
    }
  }

  cancelEdit() {
    this.isEditMode = false;
    this.resetForm();
  }

  resetForm() {
    this.selectedRequest = {
      id: null,
      name: 'New Request',
      uri: '',
      method: 'GET',
      headers: {},
      body: ''
    };
    this.headersArray = [];
  }

  refreshCollectionRequests() {
    if (this.selectedCollectionId) {
      this.httpService.getRequestsByCollection(this.selectedCollectionId).subscribe(
        (requests) => {
          // Update the collection's requests in the collections list
          const collectionIndex = this.collectionsList.findIndex(c => c.id === this.selectedCollectionId);
          if (collectionIndex !== -1) {
            this.collectionsList[collectionIndex].requests = requests;
          }
        },
        (error) => console.error('Error refreshing requests:', error)
      );
    }
  }

  // Debug method
  logHeaders() {
    console.log('Headers Array:', this.headersArray);
    console.log('Request Headers:', this.selectedRequest.headers);
  }

  handleKeyInput(index: number, event: Event) {
    const inputElement = event.target as HTMLInputElement;
    if (inputElement) {
      this.updateHeader(index, inputElement.value, this.headersArray[index].value);
    }
  }
  
  handleValueInput(index: number, event: Event) {
    const inputElement = event.target as HTMLInputElement;
    if (inputElement) {
      this.updateHeader(index, this.headersArray[index].key, inputElement.value);
    }
  }

  // Metodo per aggiornare solo l'array locale senza toccare l'oggetto selectedRequest
  onHeaderChange(index: number, isKey: boolean, event: any) {
    if (index < 0 || index >= this.headersArray.length) return;
    
    if (isKey) {
      this.headersArray[index].key = event.target.value;
    } else {
      this.headersArray[index].value = event.target.value;
    }
  }
  
  // Metodo per sincronizzare headers dall'array all'oggetto selectedRequest
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
import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientService } from '../../services/http-client.service';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { AppConfig } from '../../config/app.config';

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
    console.log('Original request from server:', request);
    
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
  }
  
  addHeader() {
    this.headersArray.push({ key: '', value: '' });
  }
  
  updateHeader(index: number, key: string, value: string) {
    if (index < 0 || index >= this.headersArray.length) return;
    
    const oldKey = this.headersArray[index].key;
    this.headersArray[index] = { key, value };
    
    const updatedHeaders = { ...this.selectedRequest.headers };
    if (oldKey && oldKey !== key) {
      delete updatedHeaders[oldKey];
    }
    if (key) {
      updatedHeaders[key] = value;
    }
    this.selectedRequest.headers = updatedHeaders;
  }
  
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
    this.httpService.setBaseUrl(AppConfig.api.baseUrl);
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
    if (!this.url || !this.method) {
      console.error("Invalid URL or Method!");
      return;
    }

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
      },
      (error: any) => {
        this.loading = false;
        this.handleError(error);
      }
    );
  }

  handleResponse(response: any, startTime: number) {
    const endTime = performance.now();
    this.responseStatus = `${response.status} ${response.statusText}`;
    this.responseTime = Math.round(endTime - startTime);
    this.responseSize = response.body.size / 1024;
  
    const contentType = response.headers.get('Content-Type') || 'text/plain';
    this.responseType = contentType;
  
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

  private handleError(error: any) {
    this.responseData = error.error ? JSON.stringify(error.error) : 'Unknown error';
    this.responseStatus = `${error.status} ${error.statusText}`;
    this.responseTime = 0;
    this.responseSize = 0;
    this.safePdfUrl = null;
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

  private emitResponseClick(response: any) {
    this.onResponseMessageClick.emit(response);
  }
  
  saveRequest() {
    // Ensure we have all required data
    if (!this.selectedRequest.name || !this.url) {
      this.error = 'Name and URL are required';
      return;
    }
    
    // Update request data from form
    this.selectedRequest.uri = this.url;
    this.selectedRequest.method = this.method;
    this.syncHeadersToRequest();
    
    if (this.selectedCollectionId) {
      this.selectedRequest.collectionId = this.selectedCollectionId;
    }
    
    if (this.isEditMode && this.selectedRequest.id) {
      this.httpService.updateRequest(this.selectedRequest.id.toString(), this.selectedRequest).subscribe(
        (updatedRequest) => {
          console.log('Request updated successfully', updatedRequest);
          this.onRequestSaved.emit(updatedRequest);
          this.refreshCollectionRequests();
        },
        (error) => {
          console.error('Error updating request:', error);
          this.error = 'Failed to update request';
        }
      );
    } else {
      if (!this.selectedCollectionId) {
        this.error = 'Please select a collection first';
        return;
      }
      
      this.httpService.createRequest(this.selectedCollectionId, this.selectedRequest).subscribe(
        (savedRequest) => {
          console.log('Request saved successfully', savedRequest);
          this.onRequestSaved.emit(savedRequest);
          this.refreshCollectionRequests();
          this.resetForm();
        },
        (error) => {
          console.error('Error saving request:', error);
          this.error = 'Failed to save request';
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
    this.url = '';
    this.method = 'GET';
    this.headersArray = [];
    this.error = '';
  }
  
  refreshCollectionRequests() {
    if (this.collections) {
      this.loadCollections();
    }
  }
  
  syncHeadersToRequest() {
    const updatedHeaders: Record<string, string> = {};
    for (const header of this.headersArray) {
      if (header.key && header.key.trim() !== '') {
        updatedHeaders[header.key] = header.value || '';
      }
    }
    this.selectedRequest.headers = updatedHeaders;
  }
} 
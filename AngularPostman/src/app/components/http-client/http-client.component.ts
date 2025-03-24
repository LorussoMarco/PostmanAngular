import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientService } from '../../services/http-client.service';
import { SidebarComponent } from '../sidebar/sidebar.component';

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

  collectionsList: any[] = [];
  
  selectedRequest: any = {
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

  constructor(private httpService: HttpClientService) {}

  ngOnInit() {
    this.httpService.setBaseUrl(this.url);
    if (this.collections) {
      this.loadCollections();
    }
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

    const startTime = performance.now();
    let headers = new Headers();
    for (const key in this.selectedRequest.headers) {
      headers.append(key, this.selectedRequest.headers[key]);
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

    if (contentType.includes('application/json')) {
      this.responseData = response.body;
    } else if (contentType.includes('text/html')) {
      this.responseData = response.body;
    } else if (contentType.includes('image')) {
      const blob = new Blob([response.body], { type: contentType });
      this.responseData = URL.createObjectURL(blob);
    } else {
      this.responseData = response.body;
    }
  }

  private handleError(error: any) {
    this.responseData = error.error ? JSON.stringify(error.error) : 'Unknown error';
    this.responseStatus = `${error.status} ${error.statusText}`;
    this.responseTime = 0;
    this.responseSize = 0;
    
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

  handleRequestSelection(request: any) {
    this.selectedRequest = {
      uri: request.uri || '',
      method: request.method || 'GET',
      headers: request.headers || {},
      body: request.body || ''
    };
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
} 
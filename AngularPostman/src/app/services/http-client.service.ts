import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AppConfig } from '../config/app.config';

@Injectable({
  providedIn: 'root'
})
export class HttpClientService {
  private baseUrl = AppConfig.api.baseUrl;
  private apiKey = AppConfig.api.apiKey;

  constructor(private http: HttpClient) {}

  setBaseUrl(url: string) {
    if (url) {
      this.baseUrl = url.endsWith('/') ? url.slice(0, -1) : url;
    }
  }

  getCollections(): Observable<any> {
    return this.http.get(`${this.baseUrl}/collections`, {
      params: { apiKey: this.apiKey }
    });
  }

  getRequestsByCollection(collectionId: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/collections/${collectionId}/requests`, {
      params: { apiKey: this.apiKey }
    });
  }

  private transformHeaders(headers: any): {[key: string]: string[]} {
    const headerArray: {[key: string]: string[]} = {};
    if (headers) {
      Object.keys(headers).forEach(key => {
        if (key && key.trim() !== '') {
          // Assicurati che il valore sia una stringa e non undefined o null
          const value = headers[key] || '';
          headerArray[key] = Array.isArray(value) ? value : [value];
        }
      });
    }
    return headerArray;
  }

  private createCleanRequest(request: any, defaultName: string) {
    // Match the exact format expected by the API based on the documentation
    const cleanRequest: {
      name: string;
      uri: string;
      method: string;
      body: string;
      headers: Record<string, string[]>;
      collectionId?: number;
    } = {
      name: request.name || defaultName,
      uri: request.uri || '',
      method: request.method || 'GET',
      body: request.body || '',
      headers: {}
    };
    
    // Add collectionId if it exists
    if (request.collectionId) {
      cleanRequest.collectionId = request.collectionId;
    }
    
    // Convert headers to match API's expected format (with array values)
    if (request.headers) {
      Object.keys(request.headers).forEach(key => {
        if (key && key.trim() !== '') {
          const value = request.headers[key] || '';
          cleanRequest.headers[key] = Array.isArray(value) ? value : [value];
        }
      });
    }
    
    console.log('Formatted request payload for API:', cleanRequest);
    return cleanRequest;
  }

  createRequest(collectionId: number, request: any): Observable<any> {
    console.log('Creating request for collection:', collectionId);
    console.log('Request data:', request);
    
    const cleanRequest = this.createCleanRequest(request, 'New Request');
    
    // Make sure the collectionId is included in both the URL path and the request body
    if (!cleanRequest.collectionId) {
      cleanRequest.collectionId = collectionId;
    }
    
    // The API expects apiKey as a query parameter, not in the body
    return this.http.post(`${this.baseUrl}/collections/${collectionId}/requests`, cleanRequest, {
      params: { apiKey: this.apiKey },
      headers: new HttpHeaders({ 'Content-Type': 'application/json' })
    });
  }

  updateRequest(requestId: string, updatedRequest: any): Observable<any> {
    console.log('Updating request with ID:', requestId);
    console.log('Request payload:', updatedRequest);
    
    const cleanRequest = this.createCleanRequest(updatedRequest, updatedRequest.name || 'Updated Request');
    
    // Make sure we're using the correct endpoint
    return this.http.put(`${this.baseUrl}/requests/${requestId}`, cleanRequest, {
      params: { apiKey: this.apiKey },
      headers: new HttpHeaders({ 
        'Content-Type': 'application/json'
      })
    });
  }

  deleteRequest(requestId: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/requests/${requestId}`, {
      params: { apiKey: this.apiKey }
    });
  }
  
  fetchRequest(url: string, method: string, body: any = null, headers: any = {}): Observable<any> {
    // Imposta le opzioni di default
    const httpOptions = {
      headers: new HttpHeaders(headers),
      observe: 'response' as 'body',
      responseType: 'blob' as 'json',  // Usiamo 'blob' come tipo di risposta
      params: new HttpParams().set('apiKey', this.apiKey) 
    };

    console.log('Sending request with options:', {
      url,
      method,
      headers: Object.fromEntries(new HttpHeaders(headers).keys().map(key => [key, headers[key]])),
      body
    });

    switch (method.toUpperCase()) {
      case 'GET':
        return this.http.get(url, httpOptions);
      case 'POST':
        return this.http.post(url, body, httpOptions);
      case 'PUT':
        return this.http.put(url, body, httpOptions);
      case 'DELETE':
        return this.http.delete(url, httpOptions);
      default:
        throw new Error(`Metodo HTTP non supportato: ${method}`);
    }
  }

  createCollection(collection: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/collections`, collection, {
      params: { apiKey: this.apiKey },
      headers: new HttpHeaders({ 'Content-Type': 'application/json' })
    });
  }
}

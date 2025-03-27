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
    return this.http.get(`${this.baseUrl}/collections`);
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
    return {
      name: request.name || defaultName,
      uri: request.uri || '',
      method: request.method || 'GET',
      headers: this.transformHeaders(request.headers),
      body: request.body || ''
    };
  }

  createRequest(collectionId: number, request: any): Observable<any> {
    const cleanRequest = this.createCleanRequest(request, 'New Request');
    return this.http.post(`${this.baseUrl}/collections/${collectionId}/requests`, cleanRequest, {
      params: { apiKey: this.apiKey },
      headers: new HttpHeaders({ 'Content-Type': 'application/json' })
    });
  }

  updateRequest(requestId: string, updatedRequest: any): Observable<any> {
    // Log della richiesta per debug
    console.log('updateRequest service called with ID:', requestId);
    console.log('Request payload:', updatedRequest);
    
    // Invia la richiesta senza trasformazioni
    return this.http.put(`${this.baseUrl}/requests/${requestId}`, updatedRequest, {
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
}

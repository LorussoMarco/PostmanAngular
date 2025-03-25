import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams  } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class HttpClientService {
  private baseUrl = 'https://supsi-ticket.cloudns.org/supsi-http-client/bff';
  private apiKey = 'lorusso1';

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

  createRequest(collectionId: number, request: any): Observable<any> {
    // Trasformiamo gli headers nel formato che si aspetta l'API
    // Il formato che sembra corretto è: { headerName: [headerValue] }
    const headerArray: {[key: string]: string[]} = {};
    if (request.headers) {
      Object.keys(request.headers).forEach(key => {
        headerArray[key] = [request.headers[key]];
      });
    }
    
    // Assicuriamoci che i dati siano in un formato JSON valido
    const cleanRequest = {
      name: request.name || 'New Request',
      uri: request.uri || '',
      method: request.method || 'GET',
      headers: headerArray,
      body: request.body || ''
    };
    
    console.log('Clean request being sent to server:', JSON.stringify(cleanRequest));
    
    // Rimuoviamo il test per semplificare
    
    return this.http.post(`${this.baseUrl}/collections/${collectionId}/requests`, cleanRequest, {
      params: { apiKey: this.apiKey },
      headers: new HttpHeaders({ 'Content-Type': 'application/json' })
    });
  }

  updateRequest(requestId: string, updatedRequest: any): Observable<any> {
    // Trasformiamo gli headers nel formato che si aspetta l'API
    // Il formato che sembra corretto è: { headerName: [headerValue] }
    const headerArray: {[key: string]: string[]} = {};
    if (updatedRequest.headers) {
      Object.keys(updatedRequest.headers).forEach(key => {
        headerArray[key] = [updatedRequest.headers[key]];
      });
    }
    
    // Assicuriamoci che i dati siano in un formato JSON valido
    const cleanRequest = {
      name: updatedRequest.name || 'Updated Request',
      uri: updatedRequest.uri || '',
      method: updatedRequest.method || 'GET',
      headers: headerArray,
      body: updatedRequest.body || ''
    };
    
    console.log('Clean request being sent to server for update:', JSON.stringify(cleanRequest));
    
    return this.http.put(`${this.baseUrl}/requests/${requestId}`, cleanRequest, {
      params: { apiKey: this.apiKey },
      headers: new HttpHeaders({ 'Content-Type': 'application/json' })
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

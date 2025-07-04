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

  private createCleanRequest(request: any, defaultName: string) {
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
    
    // Add collectionId if it exists in the input request
    if (request.collectionId) {
      cleanRequest.collectionId = request.collectionId;
    }
    
    // Convert headers to match the API's expected format (string array values)
    if (request.headers) {
      Object.keys(request.headers).forEach(key => {
        if (key && key.trim() !== '') {
          const value = request.headers[key] || '';
          // Ensure header values are always arrays of strings
          cleanRequest.headers[key] = Array.isArray(value) ? value : [value];
        }
      });
    }
    
    return cleanRequest;
  }

  createRequest(collectionId: number, request: any): Observable<any> {
    const cleanRequest = this.createCleanRequest(request, 'New Request');
    
    if (!cleanRequest.collectionId) {
      cleanRequest.collectionId = collectionId;
    }
    
    return this.http.post(`${this.baseUrl}/collections/${collectionId}/requests`, cleanRequest, {
      params: { apiKey: this.apiKey },
      headers: new HttpHeaders({ 'Content-Type': 'application/json' })
    });
  }

  updateRequest(requestId: string, updatedRequest: any): Observable<any> {
    const cleanRequest = this.createCleanRequest(updatedRequest, updatedRequest.name || 'Updated Request');
    
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
    const httpOptions = {
      headers: new HttpHeaders(headers),
      observe: 'response' as 'body', 
      responseType: 'blob' as 'json',  
      params: new HttpParams().set('apiKey', this.apiKey) 
    };

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
        throw new Error(`Unsupported HTTP method: ${method}`);
    }
  }
}

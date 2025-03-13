import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class HttpClientService {
  private baseUrl = 'https://supsi-ticket.cloudns.org/supsi-http-client/bff';
  private apiKey = 'lorusso1'; // Cambia con la tua apiKey

  constructor(private http: HttpClient) {}

  // ✅ Ottenere tutte le collections
  getCollections(): Observable<any> {
    return this.http.get(`${this.baseUrl}/collections`);
  }

  // ✅ Ottenere tutte le richieste di una collection
  getRequestsByCollection(collectionId: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/collections/${collectionId}/requests`, {
      params: { apiKey: this.apiKey }
    });
  }

  // ✅ Creare una nuova richiesta in una collection
  createRequest(collectionId: number, request: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/collections/${collectionId}/requests`, request, {
      params: { apiKey: this.apiKey },
      headers: new HttpHeaders({ 'Content-Type': 'application/json' })
    });
  }

  // ✅ Modificare una richiesta
  updateRequest(requestId: string, updatedRequest: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/requests/${requestId}`, updatedRequest, {
      params: { apiKey: this.apiKey },
      headers: new HttpHeaders({ 'Content-Type': 'application/json' })
    });
  }

  // ✅ Eliminare una richiesta
  deleteRequest(requestId: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/requests/${requestId}`, {
      params: { apiKey: this.apiKey }
    });
  }
}

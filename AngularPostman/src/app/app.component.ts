import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { FormsModule } from '@angular/forms';
import { HttpClientService } from './services/http-client.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent, FormsModule, CommonModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  title = 'AngularPostman';
  collections: any[] = [];

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

  constructor(private httpService: HttpClientService) {}

  ngOnInit() {
    this.loadCollections();
  }

  loadCollections() {
    this.httpService.getCollections().subscribe(
      (data) => this.collections = data,
      (error) => console.error('Errore nel recupero delle collections:', error)
    );
  }

  sendRequest() {
    if (!this.selectedRequest.uri || !this.selectedRequest.method) {
      console.error("URL o Metodo non validi!");
      return;
    }

    const startTime = performance.now();
    let headers = new Headers();
    for (const key in this.selectedRequest.headers) {
      headers.append(key, this.selectedRequest.headers[key]);
    }

    let options = {
      headers: headers,
      observe: 'response' as 'body',
      responseType: 'json' as 'json'
    };

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
        console.error("Metodo HTTP non supportato:", this.selectedRequest.method);
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
    this.responseSize = JSON.stringify(response.body).length / 1024; // Convertito in KB
    this.responseData = response.body;
  }

  private handleError(error: any) {
    this.responseData = error.error ? JSON.stringify(error.error) : 'Errore sconosciuto';
    this.responseStatus = `${error.status} ${error.statusText}`;
    this.responseTime = 0;
    this.responseSize = 0;
  }

  private parseRequestBody(): any {
    try {
      return JSON.parse(this.selectedRequest.body);
    } catch (error) {
      alert('Formato JSON non valido nel corpo della richiesta.');
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
}

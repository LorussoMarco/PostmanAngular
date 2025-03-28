import { Component, EventEmitter, Output, Input, OnInit } from '@angular/core';
import { HttpClientService } from '../../services/http-client.service';
import { CommonModule } from '@angular/common';  
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, FormsModule],  
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent implements OnInit {
  @Input() collections: any[] = [];
  @Input() showSearch: boolean = true;
  searchTerm: string = '';
  expandedCollections: Record<number, boolean> = {}; 
  @Output() requestSelected = new EventEmitter<any>();
  @Output() newRequestRequested = new EventEmitter<number>();

  constructor(private httpService: HttpClientService) {}

  ngOnInit() {
    this.loadCollections();
  }

  filteredRequests(requests: any[]): any[] {
    if (!this.searchTerm) return requests;
    return requests.filter(req =>
      req.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
      req.method.toLowerCase().includes(this.searchTerm.toLowerCase())
    );
  }

  addNewRequest(collectionId: number, event: Event) {
    event.stopPropagation();
    
    // Ensure the collection is expanded to show the new request when created
    this.expandedCollections[collectionId] = true;
    
    // Make sure we have the collection loaded
    const collection = this.collections.find(c => c.id === collectionId);
    if (!collection) {
      console.error('Collection not found:', collectionId);
      return;
    }
    
    // Create an empty request template with collectionId
    const emptyRequest = {
      id: null, // null ID indicates this is a new request
      name: 'New Request',
      method: 'GET',
      uri: '',
      headers: {},
      body: '',
      collectionId: collectionId
    };

    console.log('Creating new request for collection:', collection.name, '(ID:', collectionId, ')');
    
    // Emit this request to be handled by the http-client component
    this.requestSelected.emit(emptyRequest);
  }

  triggerFileInput() {
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    fileInput?.click();
  }

  importCollection(event: Event) {
    const input = event.target as HTMLInputElement;
    
    if (!input.files || input.files.length === 0) {
      console.error("Nessun file selezionato.");
      return;
    }
  
    const file = input.files[0];
    const reader = new FileReader();
  
    reader.onload = (e) => {
      try {
        const importedData = JSON.parse(e.target?.result as string);
        console.log("Collection importata:", importedData);

        if (!importedData.info || !importedData.item || !Array.isArray(importedData.item)) {
          throw new Error("Formato JSON non valido.");
        }

        const newCollection = {
          id: this.generateUniqueId(),
          name: importedData.info.name || "Imported Collection",
          requests: importedData.item.map((item: any) => ({
            id: this.generateUniqueId(),
            name: item.name || "Unnamed Request",
            method: item.request?.method || "GET",
            headers: item.request?.header || {},
            uri: item.request?.url || '',
            body: item.request?.body?.raw || ''
          }))
        };

        this.collections.push(newCollection);
        this.expandedCollections[newCollection.id] = true; 
        this.collections = [...this.collections];

        console.log("Collections aggiornate:", this.collections);
      } catch (error) {
        console.error("Errore nell'importazione:", error);
        alert("Errore nel formato del file importato.");
      }
    };

    reader.readAsText(file);
  }

  exportCollection(collectionId: number) {
    const collection = this.collections.find(c => c.id === collectionId);
    if (!collection) {
      console.error('Collection not found.');
      return;
    }

    const exportedJson = {
      info: {
        _postman_id: this.generateUUID(),
        name: collection.name,
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
        _exporter_id: '43109644'
      },
      item: (collection.requests || []).map((request: any) => ({
        name: request.name,
        request: {
          method: request.method,
          header: request.headers || [],
          url: request.uri
        },
        response: []
      }))
    };

    this.downloadJson(exportedJson, `${collection.name}.json`);
  }

  loadCollections() {
    this.httpService.getCollections().subscribe(
      (data) => this.collections = data,
      (error) => console.error('Errore nel caricamento delle collections:', error)
    );
  }

  loadRequests(collectionId: number) {
    console.log('Loading requests for collection:', collectionId);
    
    // If the collection is not expanded, load the requests
    if (!this.expandedCollections[collectionId]) {
      this.httpService.getRequestsByCollection(collectionId).subscribe(
        (data) => {
          console.log('Requests loaded:', data);
          const collection = this.collections.find(c => c.id === collectionId);
          if (collection) {
            collection.requests = data;
            // Expand the collection after loading
            this.expandedCollections[collectionId] = true;
          }
        },
        (error) => {
          console.error('Error loading requests:', error);
          // Still expand the collection even if there was an error
          // This allows the user to create new requests
          this.expandedCollections[collectionId] = true;
        }
      );
    } else {
      // Toggle the expansion state
      this.expandedCollections[collectionId] = !this.expandedCollections[collectionId]; 
    }
  }

  deleteRequest(request: any) {
    this.httpService.deleteRequest(request.id).subscribe(
      () => {
        console.log("Richiesta eliminata");
        this.loadRequests(request.collectionId);
      },
      (error) => console.error("Errore nell'eliminazione della richiesta:", error)
    );
  }

  selectRequest(request: any, collectionId: number) {
    const requestWithCollection = { 
      ...request, 
      collectionId 
    };
    this.requestSelected.emit(requestWithCollection);
  }

  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  private generateUniqueId(): number {
    return Date.now();
  }

  private downloadJson(data: any, filename: string) {
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
}

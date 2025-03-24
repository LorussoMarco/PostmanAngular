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
  menuOpenCollectionId: number | null = null;
  @Output() requestSelected = new EventEmitter<any>();

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

  toggleMenu(collectionId: number, event: Event) {
    event.stopPropagation();
    this.menuOpenCollectionId = this.menuOpenCollectionId === collectionId ? null : collectionId;
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
    if (!this.expandedCollections[collectionId]) {
      this.httpService.getRequestsByCollection(collectionId).subscribe(
        (data) => {
          const collection = this.collections.find(c => c.id === collectionId);
          if (collection) {
            collection.requests = data;
          }
          this.expandedCollections[collectionId] = true; 
        },
        (error) => console.error('Errore nel caricamento delle richieste:', error)
      );
    } else {
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

  selectRequest(request: any) {
    this.requestSelected.emit(request);
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

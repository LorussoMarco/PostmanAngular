import { Component, EventEmitter, Output, Input , OnInit } from '@angular/core';
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
  searchTerm: string = '';
  expandedCollection: number | null = null;
  expandedCollectionId: number | null = null;
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

  importCollection(collectionId: number) {
    console.log(`Import collection ${collectionId}`);
  }
  
  exportCollection(collectionId: number) {
    console.log(`Export collection ${collectionId}`);
  }

  loadCollections() {
    this.httpService.getCollections().subscribe(
      (data) => this.collections = data,
      (error) => console.error('Errore nel caricamento delle collections:', error)
    );
  }

  toggleDropdown(collectionId: number) {
    if (this.expandedCollection === collectionId) {
      this.expandedCollection = null; 
    } else {
      this.expandedCollection = collectionId; 
      this.httpService.getRequestsByCollection(collectionId).subscribe(
        (data) => {
          const collection = this.collections.find(c => c.id === collectionId);
          if (collection) {
            collection.requests = data;
          }
        },
        (error) => console.error('Errore nel caricamento delle richieste:', error)
      );
    }
  }

  loadRequests(collectionId: number) {
    console.log(`Loading requests for collection ${collectionId}...`);
    this.httpService.getRequestsByCollection(collectionId).subscribe(
      (data) => {
        console.log(`Requests for collection ${collectionId}:`, data);

        const collectionIndex = this.collections.findIndex(c => c.id === collectionId);
        if (collectionIndex !== -1) {
          this.collections[collectionIndex].requests = data;
        }

        this.expandedCollectionId = this.expandedCollectionId === collectionId ? null : collectionId;
      },
      (error) => console.error(`Errore nel caricamento delle richieste per la collection ${collectionId}:`, error)
    );
  }

  selectRequest(requestId: string) {
    this.requestSelected.emit(requestId);
  }
}

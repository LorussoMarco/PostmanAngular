import { Component, EventEmitter, Output, OnInit } from '@angular/core';
import { HttpClientService } from '../../services/http-client.service';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss']
})
export class SidebarComponent implements OnInit {
  collections: any[] = [];

  @Output() requestSelected = new EventEmitter<string>();

  constructor(private httpService: HttpClientService) {}

  ngOnInit() {
    this.loadCollections();
  }

  // ✅ Carica le collections all'avvio
  loadCollections() {
    this.httpService.getCollections().subscribe(
      (data) => this.collections = data,
      (error) => console.error('Errore nel caricamento delle collections:', error)
    );
  }

  // ✅ Metodo che mancava: carica le richieste della collection selezionata
  loadRequests(collectionId: number) {
    this.httpService.getRequestsByCollection(collectionId).subscribe(
      (data) => {
        const collectionIndex = this.collections.findIndex(c => c.id === collectionId);
        if (collectionIndex !== -1) {
          this.collections[collectionIndex].requests = data; // Aggiunge le richieste alla collection
        }
      },
      (error) => console.error('Errore nel caricamento delle richieste:', error)
    );
  }

  selectRequest(requestId: string) {
    this.requestSelected.emit(requestId);
  }
}

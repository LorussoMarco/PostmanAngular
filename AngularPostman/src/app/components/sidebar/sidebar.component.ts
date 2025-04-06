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

  constructor(private httpService: HttpClientService) {}

  ngOnInit() {
    this.loadCollections();
  }

  filteredRequests(requests: any[]): any[] {
    if (!this.searchTerm) return requests;
    // Filter requests based on search term (name or method)
    return requests.filter(req =>
      req.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
      req.method.toLowerCase().includes(this.searchTerm.toLowerCase())
    );
  }

  addNewRequest(collectionId: number, event: Event) {
    event.stopPropagation();     
    this.expandedCollections[collectionId] = true;
    
    const collection = this.collections.find(c => c.id === collectionId);
    if (!collection) {
      console.error('Collection not found:', collectionId);
      return;
    }
    
    // Create an empty request template associated with the collection
    const emptyRequest = {
      id: null, 
      name: 'New Request',
      method: 'GET',
      uri: '',
      headers: {},
      body: '',
      collectionId: collectionId
    };

    // Emit this new request object to be handled by the http-client component
    this.requestSelected.emit(emptyRequest);
  }

  triggerFileInput() {
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    fileInput?.click();
  }

  importCollection(event: Event) {
    const input = event.target as HTMLInputElement;
    
    if (!input.files || input.files.length === 0) {
      console.error("No file selected.");
      return;
    }
  
    const file = input.files[0];
    const reader = new FileReader();
  
    reader.onload = (e) => {
      try {
        const importedData = JSON.parse(e.target?.result as string);

        // Basic validation for Postman collection format (v2.1.0)
        if (!importedData.info || !importedData.item || !Array.isArray(importedData.item)) {
          throw new Error("Invalid JSON format."); 
        }

        // Map imported data to the application's collection/request structure
        const newCollection = {
          id: this.generateUniqueId(), // Generate a temporary unique ID
          name: importedData.info.name || "Imported Collection",
          requests: importedData.item.map((item: any) => ({
            id: this.generateUniqueId(), // Generate temporary unique IDs for requests
            name: item.name || "Unnamed Request",
            method: item.request?.method || "GET",
            headers: item.request?.header || {}, // Assuming headers are objects/arrays
            uri: item.request?.url || '', // Handle potential missing URL
            body: item.request?.body?.raw || '' // Extract raw body if available
          }))
        };

        // Add the new collection to the list and expand it
        this.collections.push(newCollection);
        this.expandedCollections[newCollection.id] = true; 
        // Trigger change detection by creating a new array reference
        this.collections = [...this.collections];
      } catch (error) {
        console.error("Error during import:", error); 
        alert("Error in the imported file format."); 
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

    // Format the collection data into Postman v2.1.0 export format
    const exportedJson = {
      info: {
        _postman_id: this.generateUUID(), // Generate a new UUID for the export
        name: collection.name,
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
        _exporter_id: '43109644' // Example exporter ID
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

    // Trigger download of the formatted JSON
    this.downloadJson(exportedJson, `${collection.name}.json`);
  }

  loadCollections() {
    this.httpService.getCollections().subscribe(
      (data) => this.collections = data,
      (error) => console.error('Error loading collections:', error) 
    );
  }

  loadRequests(collectionId: number) {
    // Only load requests if the collection is not already expanded
    if (!this.expandedCollections[collectionId]) {
      this.httpService.getRequestsByCollection(collectionId).subscribe(
        (data) => {
          const collection = this.collections.find(c => c.id === collectionId);
          if (collection) {
            collection.requests = data;
            // Expand the collection visually after loading its requests
            this.expandedCollections[collectionId] = true;
          }
        },
        (error) => {
          console.error('Error loading requests:', error);
          this.expandedCollections[collectionId] = true;
        }
      );
    } else {
      // If already expanded, clicking again toggles the expansion state (collapse)
      this.expandedCollections[collectionId] = !this.expandedCollections[collectionId]; 
    }
  }

  deleteRequest(request: any) {
    // Call the service to delete the request by its ID
    this.httpService.deleteRequest(request.id).subscribe(
      () => {
        // Reload the requests for the parent collection to update the UI
        this.loadRequests(request.collectionId);
      },
      (error) => console.error("Error deleting request:", error) 
    );
  }

  selectRequest(request: any, collectionId: number) {
    // Prepare the request object with its associated collection ID
    const requestWithCollection = { 
      ...request, 
      collectionId 
    };
    // Emit the selected request data to the parent component
    this.requestSelected.emit(requestWithCollection);
  }

  // Generates a standard RFC4122 version 4 UUID
  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  // Generates a simple timestamp-based unique ID (suitable for temporary client-side IDs)
  private generateUniqueId(): number {
    return Date.now();
  }

  // Helper function to trigger a browser download for JSON data
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
    URL.revokeObjectURL(url); 
  }
}

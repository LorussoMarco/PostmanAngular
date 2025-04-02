import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientService } from '../../services/http-client.service';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-http-client',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent],
  templateUrl: './http-client.component.html',
  styleUrls: ['./http-client.component.css']
})
export class HttpClientComponent implements OnInit {
  @Input() search: boolean = true;
  @Input() collections: boolean = true;
  @Output() onResponseMessageClick = new EventEmitter<any>();
  @Output() onRequestSaved = new EventEmitter<any>();

  url = '';
  method = 'GET';
  loading = false;
  error = '';

  collectionsList: any[] = [];
  selectedCollectionId: number | null = null;
  isEditMode: boolean = false;
  
  // Holds the currently selected request object (either new or existing)
  selectedRequest: any = {
    id: null,
    name: 'New Request',
    uri: '',
    method: 'GET',
    headers: {},
    body: ''
  };

  // Properties to store the details of the last HTTP response
  responseData: any = null;
  responseStatus: string = '';
  responseTime: number = 0;
  responseSize: number = 0;
  responseType: string = '';
  safePdfUrl: SafeResourceUrl | null = null; // For safely displaying PDF responses

  // Array representation of headers for easy editing in the template
  headersArray: { key: string, value: string }[] = [];
  
  // Updates the headersArray based on the selectedRequest.headers object
  updateHeadersArray() {
    this.headersArray = [];
    if (this.selectedRequest && typeof this.selectedRequest.headers === 'object' && this.selectedRequest.headers !== null) {
      for (const key in this.selectedRequest.headers) {
        // Only add if the key is a direct property and is not empty/whitespace
        if (Object.prototype.hasOwnProperty.call(this.selectedRequest.headers, key) && key && key.trim() !== '') {
          this.headersArray.push({ key, value: this.selectedRequest.headers[key] || '' });
        }
      }
    } else {
      // Reset headers array if headers object is invalid or null
      this.headersArray = [];
    }
  }
  
  // Angular lifecycle hook called when any data-bound input properties change
  ngOnChanges() {
    this.updateHeadersArray();
  }
  
  // Handles the selection of a request from the sidebar component
  handleRequestSelection(request: any) {
    this.isEditMode = request.id ? true : false;
    // Update the selectedRequest object with the data from the sidebar
    this.selectedRequest = {
      id: request.id || null,
      name: request.name || 'New Request',
      uri: request.uri || '',
      method: request.method || 'GET',
      headers: request.headers || {},
      body: request.body || '',
      collectionId: request.collectionId
    };
    
    // Update form fields based on the selected request
    this.url = request.uri || '';
    this.method = request.method || 'GET';
    
    // Store the collection ID if present
    if (request.collectionId) {
      this.selectedCollectionId = request.collectionId;
    }
    
    // Refresh the headers array for the template
    this.updateHeadersArray();
    
    // If this is a new request being added via the sidebar's + button
    if (!this.isEditMode && request.collectionId) {
      this.error = ''; // Clear any previous errors
    }
  }
  
  // Adds a new empty row to the headers array for editing
  addHeader() {
    this.headersArray.push({ key: '', value: '' });
  }
  
  // Removes a header row from the array and updates the selectedRequest
  removeHeader(index: number) {
    if (index < 0 || index >= this.headersArray.length) return;
    
    const headerToRemove = this.headersArray[index];
    // If the header has a key, remove it from the underlying headers object
    if (headerToRemove.key) {
      const updatedHeaders = { ...this.selectedRequest.headers };
      delete updatedHeaders[headerToRemove.key];
      this.selectedRequest.headers = updatedHeaders;
    }
    
    // Remove the row from the array used in the template
    this.headersArray.splice(index, 1);
  }

  constructor(private httpService: HttpClientService, private sanitizer: DomSanitizer) {}

  // Angular lifecycle hook called once the component is initialized
  ngOnInit() {
    // Load collections if the collections feature is enabled
    if (this.collections) {
      this.loadCollections();
    }
    // Initialize the headers array
    this.updateHeadersArray();
  }

  // Loads the list of collections from the service
  loadCollections() {
    this.loading = true;
    this.httpService.getCollections().subscribe(
      (data) => {
        this.collectionsList = data;
        this.loading = false;
      },
      (error) => {
        console.error('Error loading collections:', error);
        this.error = `Failed to load collections: ${error.status} ${error.statusText}`;
        this.loading = false;
      }
    );
  }

  // Sends the configured HTTP request using the service
  sendRequest() {
    if (!this.url || !this.method) {
      console.error("Invalid URL or Method!");
      return;
    }

    // Update the selectedRequest object with current form values
    this.selectedRequest.uri = this.url;
    this.selectedRequest.method = this.method;
    this.syncHeadersToRequest(); // Ensure headers object is updated from headersArray

    const startTime = performance.now(); // For timing the request
    // Prepare headers for the native Fetch API or HttpClient
    let headers = new Headers();
    for (const header of this.headersArray) {
      if (header.key && header.key.trim() !== '') {
        headers.append(header.key, header.value || '');
      }
    }

    let requestObservable;

    // Call the appropriate service method based on the selected HTTP method
    switch (this.method.toUpperCase()) {
      case 'GET':
        requestObservable = this.httpService.fetchRequest(this.url, 'GET', null, headers);
        break;
      case 'POST':
        requestObservable = this.httpService.fetchRequest(this.url, 'POST', this.parseRequestBody(), headers);
        break;
      case 'PUT':
        requestObservable = this.httpService.fetchRequest(this.url, 'PUT', this.parseRequestBody(), headers);
        break;
      case 'DELETE':
        requestObservable = this.httpService.fetchRequest(this.url, 'DELETE', null, headers);
        break;
      default:
        console.error("HTTP method not supported:", this.method);
        return;
    }

    this.loading = true;

    // Subscribe to the observable returned by the service
    requestObservable.subscribe(
      (response: any) => {
        this.loading = false;
        this.handleResponse(response, startTime); // Process successful response
      },
      (error: any) => {
        this.loading = false;
        this.handleError(error); // Process error response
      }
    );
  }

  // Processes the successful HTTP response
  handleResponse(response: any, startTime: number) {
    const endTime = performance.now();
    // Store basic response metadata
    this.responseStatus = `${response.status} ${response.statusText}`;
    this.responseTime = Math.round(endTime - startTime);
    this.responseSize = response.body.size / 1024; // Size in KB
  
    const contentType = response.headers.get('Content-Type') || 'text/plain';
    this.responseType = contentType;
  
    // Handle response body based on Content-Type
    if (contentType.includes('application/json')) {
      response.body.text().then((text: string) => {
        try {
          this.responseData = JSON.parse(text);
        } catch (e) {
          console.error("Error parsing JSON:", e);
          this.responseData = text; // Show raw text if JSON parsing fails
        }
      });
      this.safePdfUrl = null;
  
    } else if (contentType.includes('text/html')) {
      response.body.text().then((html: string) => {
        this.responseData = html;
      });
      this.safePdfUrl = null;
  
    } else if (contentType.includes('application/pdf')) {
      const blob = new Blob([response.body], { type: 'application/pdf' });
      const unsafeUrl = URL.createObjectURL(blob);
      this.responseData = unsafeUrl; // Store the object URL
      // Sanitize the URL for safe use in an iframe src
      this.safePdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl(unsafeUrl);
  
    } else if (contentType.includes('image')) {
      const blob = new Blob([response.body], { type: contentType });
      this.responseData = URL.createObjectURL(blob); // Create object URL for image display
      this.safePdfUrl = null;
  
    } else { // Handle as plain text by default
      response.body.text().then((text: string) => {
        this.responseData = text;
      });
      this.safePdfUrl = null;
    }
  }

  // Handles HTTP errors
  private handleError(error: any) {
    this.responseData = error.error ? JSON.stringify(error.error) : 'Unknown error';
    this.responseStatus = `${error.status} ${error.statusText}`;
    this.responseTime = 0;
    this.responseSize = 0;
    this.safePdfUrl = null;
  }

  // Parses the request body string into JSON, returns raw string on error
  private parseRequestBody(): any {
    if (!this.selectedRequest.body || this.selectedRequest.body.trim() === '') {
      return null; // Return null if body is empty
    }
    
    try {
      return JSON.parse(this.selectedRequest.body);
    } catch (error) {
      console.error('Invalid JSON format in request body:', error);
      // Return the raw body if JSON parsing fails, to avoid blocking UI
      return this.selectedRequest.body;
    }
  }

  // Called when the response display area is clicked
  handleResponseClick() {
    if (!this.responseData) return; // Do nothing if there's no response data
    
    // Prepare the data object to emit
    this.emitResponseClick({
      status: this.responseStatus,
      time: this.responseTime,
      size: this.responseSize,
      type: this.responseType,
      data: this.responseData,
      headers: {} // Note: Headers from the actual response are not currently included here
    });
  }

  // Emits the response data through the onResponseMessageClick output
  private emitResponseClick(response: any) {
    this.onResponseMessageClick.emit(response);
  }
  
  // Saves the current request (either creates a new one or updates an existing one)
  saveRequest() {
    // Validate required fields
    if (!this.selectedRequest.name || !this.url) {
      this.error = 'Name and URL are required';
      return;
    }
    
    // Update the selectedRequest object with current form values
    this.selectedRequest.uri = this.url;
    this.selectedRequest.method = this.method;
    this.syncHeadersToRequest(); // Ensure headers are synced from the array
    
    // Ensure a collection is associated with the request
    if (!this.selectedCollectionId) {
      this.error = 'A request must be associated with a collection. Please select a request from the sidebar first.';
      return;
    }
    
    // Prepare the final request object to be sent to the service
    const requestToSave = {
      ...this.selectedRequest,
      collectionId: this.selectedCollectionId
    };
    
    this.loading = true;
    
    // Determine whether to update (edit mode) or create
    if (this.isEditMode && this.selectedRequest.id) {
      // Update existing request
      this.httpService.updateRequest(this.selectedRequest.id.toString(), requestToSave).subscribe(
        (updatedRequest) => {
          this.onRequestSaved.emit(updatedRequest); // Notify parent about the save
          this.refreshCollectionRequests(); // Refresh sidebar
          this.error = ''; // Clear errors
          this.loading = false;
        },
        (error) => {
          console.error('Error updating request:', error);
          this.error = `Failed to update request: ${error.status} ${error.statusText}`;
          // Log detailed error if available
          if (error.error && typeof error.error === 'object') {
            console.error('Error details:', error.error);
          }
          this.loading = false;
        }
      );
    } else {
      // Create new request
      this.httpService.createRequest(this.selectedCollectionId, requestToSave).subscribe(
        (savedRequest) => {
          this.onRequestSaved.emit(savedRequest); // Notify parent
          this.refreshCollectionRequests(); // Refresh sidebar
          this.resetForm(); // Reset form after successful creation
          this.error = ''; // Clear errors
          this.loading = false;
        },
        (error) => {
          console.error('Error saving request:', error);
          this.error = `Failed to save request: ${error.status} ${error.statusText}`;
          // Log detailed error if available
          if (error.error && typeof error.error === 'object') {
            console.error('Error details:', error.error);
          }
          this.loading = false;
        }
      );
    }
  }

  // Cancels the edit mode and resets the form
  cancelEdit() {
    this.isEditMode = false;
    this.resetForm();
  }
  
  // Resets the form fields and selected request to default state
  resetForm() {
    this.selectedRequest = {
      id: null,
      name: 'New Request',
      uri: '',
      method: 'GET',
      headers: {},
      body: ''
    };
    this.url = '';
    this.method = 'GET';
    this.headersArray = [];
    this.error = '';
  }
  
  // Reloads the collections list (used to refresh sidebar after save/update)
  refreshCollectionRequests() {
    if (this.collections) {
      this.loadCollections();
    }
  }
  
  // Synchronizes the headersArray (used in template) back to the selectedRequest.headers object
  syncHeadersToRequest() {
    const updatedHeaders: Record<string, string> = {};
    
    for (const header of this.headersArray) {
      if (header.key && header.key.trim() !== '') {
        // Store headers as simple key-value strings in the component state
        // The HttpClientService will handle converting values to arrays for the API
        updatedHeaders[header.key.trim()] = header.value || '';
      }
    }
    
    this.selectedRequest.headers = updatedHeaders;
  }
} 
import { Component, Renderer2, ViewEncapsulation } from '@angular/core';
import { HttpClientComponent } from './components/http-client/http-client.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [HttpClientComponent, CommonModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  // Garantisce che gli stili vengano applicati globalmente
  encapsulation: ViewEncapsulation.None
})
export class AppComponent {
  title = 'AngularPostman';
  showResponseDetails = false;
  currentResponse: any = null;
  
  constructor(private renderer: Renderer2) {}

  handleResponseMessageClick(response: any) {
    console.log('Response clicked, showing modal', response);
    this.currentResponse = response;
    this.showResponseDetails = true;
    
    // Fix for modal display issues
    // Prevent background scrolling when modal is open
    this.renderer.addClass(document.body, 'modal-open');
    
    // Force browser to recalculate layout and ensure modal is visible
    window.setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
      
      // Force repaint to ensure modal visibility
      const overlay = document.querySelector('.response-details-overlay') as HTMLElement;
      if (overlay) {
        console.log('Forcing repaint of modal overlay');
        overlay.style.display = 'none';
        overlay.offsetHeight; // Force reflow
        overlay.style.display = 'flex';
      }
    }, 10);
  }

  closeResponseModal() {
    console.log('Closing modal');
    this.showResponseDetails = false;
    this.currentResponse = null;
    
    // Re-enable scrolling when modal is closed
    this.renderer.removeClass(document.body, 'modal-open');
  }

  // Prevent modal close when clicking on the modal itself
  stopPropagation(event: Event) {
    console.log('Stopping event propagation inside modal');
    event.stopPropagation();
  }
}

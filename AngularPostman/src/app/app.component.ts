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
    this.currentResponse = response;
    this.showResponseDetails = true;
    
    this.renderer.addClass(document.body, 'modal-open');
    
    window.setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
      
      const overlay = document.querySelector('.response-details-overlay') as HTMLElement;
      if (overlay) {
        overlay.style.display = 'none';
        overlay.offsetHeight; 
        overlay.style.display = 'flex';
      }
    }, 10);
  }

  closeResponseModal() {
    this.showResponseDetails = false;
    this.currentResponse = null;
    this.renderer.removeClass(document.body, 'modal-open');
  }

  stopPropagation(event: Event) {
    event.stopPropagation();
  }
}

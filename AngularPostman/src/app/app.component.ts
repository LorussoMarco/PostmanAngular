import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HttpClientComponent } from './components/http-client/http-client.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, HttpClientComponent, CommonModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'AngularPostman';
  responseDetails: any = null;

  handleResponseMessageClick(response: any) {
    this.responseDetails = response;
    console.log('Response clicked:', response);
  }
}

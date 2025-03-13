import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { FormsModule } from '@angular/forms';
import { HttpClientService } from './services/http-client.service';


@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent, FormsModule], 
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  title = 'AngularPostman';
  collections: any[] = [];

  constructor(private httpService: HttpClientService) {}

  ngOnInit() {
    this.loadCollections();
  }

  loadCollections() {
    this.httpService.getCollections().subscribe(
      (data) => {
        console.log('Collections received:', data); // 🔍 Controlla i dati in console
        this.collections = data;
      },
      (error) => console.error('Errore nel recupero delle collections:', error)
    );
  }
}
  
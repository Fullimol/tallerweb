import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ProductosPage } from "./pages/productos-page/productos-page";

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ProductosPage],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('tallerweb');
}

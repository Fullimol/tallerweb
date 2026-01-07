import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

type Producto = {
  codigo: string;
  producto: string;
  precio_c_iva: number;
};

@Component({
  selector: 'app-lista-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './lista-page.html',
})
export class ListaPage {
  private readonly LS_PRODUCTOS = 'productos_csv';

  productos: Producto[] = [];
  filtro = '';

  ngOnInit() {
    const raw = localStorage.getItem(this.LS_PRODUCTOS);
    if (!raw) {
      this.productos = [];
      return;
    }

    try {
      this.productos = JSON.parse(raw) as Producto[];
      // orden por código (opcional)
      this.productos.sort((a, b) =>
        (a.codigo ?? '').localeCompare(b.codigo ?? '', 'es', { sensitivity: 'base' })
      );
    } catch {
      this.productos = [];
    }
  }

  get productosFiltrados(): Producto[] {
    const q = this.filtro.trim().toLowerCase();
    if (!q) return this.productos;

    return this.productos.filter(p =>
      (p.codigo ?? '').toLowerCase().includes(q) ||
      (p.producto ?? '').toLowerCase().includes(q)
    );
  }
}

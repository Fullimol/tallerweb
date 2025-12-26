import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import Papa from 'papaparse';

type Producto = {
  codigo: string;
  producto: string;
  precio_s_iva: number;
};

@Component({
  selector: 'app-productos-page',
  templateUrl: './productos-page.html',
  styleUrls: ['./productos-page.css'],
  imports: [CommonModule, FormsModule],
})
export class ProductosPage {
  productosMap = new Map<string, Producto>();

  archivosCargados: string[] = [];
  totalProductos = 0;

  codigoBuscado = '';
  mensaje = '';

  ngOnInit() {
    this.cargarProductosDesdeLocalStorage();
  }



  // Lista acumulada (sin borrar anteriores)
  seleccionados: Producto[] = [];

  async onFilesSelected(event: Event) {
    this.mensaje = '';
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const files = Array.from(input.files);

    for (const file of files) {
      if (!file.name.toLowerCase().endsWith('.csv')) continue;

      const productos = await this.parseCsv(file);

      for (const p of productos) {
        const key = p.codigo.trim().toUpperCase();
        if (!key) continue;
        this.productosMap.set(key, p); // último CSV pisa
      }

      this.archivosCargados.push(file.name);
    }

    this.totalProductos = this.productosMap.size;
    input.value = '';
    this.mensaje = `Cargados ${this.archivosCargados.length} archivo(s). Productos únicos: ${this.totalProductos}.`;
    this.guardarProductosEnLocalStorage();
  }

  buscarYAgregar() {
    this.mensaje = '';

    const code = this.codigoBuscado.trim().toUpperCase();
    if (!code) {
      this.mensaje = 'Ingresá un código.';
      return;
    }
    if (this.productosMap.size === 0) {
      this.mensaje = 'Primero cargá al menos un CSV.';
      return;
    }

    const prod = this.productosMap.get(code);
    if (!prod) {
      this.mensaje = `No se encontró el código: ${code}`;
      return;
    }

    // Si querés permitir repetidos, sacá este if y siempre pusheá
    const yaAgregado = this.seleccionados.some(p => p.codigo.toUpperCase() === code);
    if (yaAgregado) {
      this.mensaje = `El código ${code} ya está agregado.`;
      this.codigoBuscado = '';
      return;
    }

    this.seleccionados.push(prod);
    this.codigoBuscado = '';
  }

  eliminarItem(codigo: string) {
    const code = codigo.trim().toUpperCase();
    this.seleccionados = this.seleccionados.filter(x => x.codigo.trim().toUpperCase() !== code);
  }

  vaciar() {
    this.seleccionados = [];
  }

  get totalSinIva(): number {
    return this.seleccionados.reduce((acc, p) => acc + (p.precio_s_iva || 0), 0);
  }

  // ---------- CSV parsing ----------
  private parseCsv(file: File): Promise<Producto[]> {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (result) => {
          try {
            const rows = (result.data as any[]).map((r) => this.normalizeRow(r));
            resolve(rows.filter(r => r.codigo && r.producto));
          } catch (e) {
            reject(e);
          }
        },
        error: (err) => reject(err),
      });
    });
  }

  private normalizeRow(r: any): Producto {
    const toNumber = (v: any) => {
      if (v === null || v === undefined) return 0;
      const s = String(v).trim();
      if (!s) return 0;

      // 91.250,49
      const commaDecimal = /,\d{2}$/.test(s);
      if (commaDecimal) {
        return Number(s.replace(/\./g, '').replace(',', '.')) || 0;
      }

      // 91250.49 o 91,250.49
      return Number(s.replace(/,/g, '')) || 0;
    };

    return {
      codigo: String(r.codigo ?? '').trim(),
      producto: String(r.producto ?? '').trim(),
      precio_s_iva: toNumber(r.precio_s_iva),
    };
  }



  // ---------- Local Storage ----------
  private readonly LS_PRODUCTOS = 'productos_csv';

  private guardarProductosEnLocalStorage() {
    const productosArray = Array.from(this.productosMap.values());
    localStorage.setItem(this.LS_PRODUCTOS, JSON.stringify(productosArray));
  }

  private cargarProductosDesdeLocalStorage() {
    const raw = localStorage.getItem(this.LS_PRODUCTOS);
    if (!raw) return;

    try {
      const productos: Producto[] = JSON.parse(raw);

      this.productosMap.clear();
      for (const p of productos) {
        const key = (p.codigo ?? '').trim().toUpperCase();
        if (!key) continue;
        this.productosMap.set(key, p);
      }

      this.totalProductos = this.productosMap.size;
      this.mensaje = `Piezas cargadas: ${this.totalProductos}`;
    } catch {
      // Si hay basura en el storage, lo limpiamos
      localStorage.removeItem(this.LS_PRODUCTOS);
    }
  }

  borrarProductosCargados() {
  localStorage.removeItem(this.LS_PRODUCTOS);
  this.productosMap.clear();
  this.totalProductos = 0;
  this.archivosCargados = [];
  this.mensaje = 'Piezas cargadas borradas.';
}


}

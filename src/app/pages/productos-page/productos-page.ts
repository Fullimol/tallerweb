import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import Papa from 'papaparse';

type Producto = {
  codigo: string;
  producto: string;
  precio_c_iva: number; // (mantenido como vos lo usás hoy)
};

@Component({
  selector: 'app-productos-page',
  templateUrl: './productos-page.html',
  styleUrls: ['./productos-page.css'],
  imports: [CommonModule, FormsModule],
})
export class ProductosPage {
  productosMap = new Map<string, Producto>();

  isLoading = false;

  archivosCargados: string[] = [];
  totalProductos = 0;

  codigoBuscado = '';
  mensaje = '';

  seleccionados: Producto[] = [];


  // ⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️
  // cambiar la fecha esta cada vez que se actualice el CSV en el repo/deploy 
  // (USAR LA FECHA DE PRECIOS QUE INDICA EL PDF DE "TUBOSILEN" )
  private readonly CSV_VERSION = '15-12-2025'; 
  fechaVersion = this.CSV_VERSION;
  // ⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️

  // ---------- Local Storage ----------
  private readonly LS_PRODUCTOS = 'productos_csv';
  private readonly LS_ARCHIVOS = 'csv_archivos_cargados';

  // ✅ CSV del repo/deploy: public/csv/listaprecios.csv
  private readonly CSV_NAME = 'listaprecios.csv';
  private readonly CSV_URL = '/csv/listaprecios.csv';


async ngOnInit() {
  this.isLoading = true;

  setTimeout(async () => {
    try {
      await this.cargarDesdeRepoYGuardar();
    } catch {
      this.usarLocalStorageComoFallback();
    } finally {
      this.isLoading = false;
    }
  }, 1500);
}



  private async cargarDesdeRepoYGuardar() {
    this.mensaje = 'Cargando lista de precios...';

    try {
      const csvText = await this.descargarCsv(this.CSV_URL);
      await this.parseCsvTextYGuardarEnMap(csvText);

      this.archivosCargados = [this.CSV_NAME];
      this.totalProductos = this.productosMap.size;

      // Guardar como respaldo
      this.guardarProductosEnLocalStorage();
      this.guardarArchivosEnLocalStorage();

      this.mensaje = `Piezas cargadas: ${this.totalProductos}`;
    } catch (e) {
      this.mensaje = 'No se pudo descargar la lista.';
      throw e; // 👈 clave
    }
  }

  //en caso de no poder descargar el csv, usar el ultimo guardado en localstorage
  private usarLocalStorageComoFallback() {
    const raw = localStorage.getItem(this.LS_PRODUCTOS);

    if (!raw) {
      this.mensaje = 'Sin conexión y sin datos guardados.';
      return;
    }

    try {
      const productos: Producto[] = JSON.parse(raw);

      this.productosMap.clear();
      for (const p of productos) {
        const key = (p.codigo ?? '').trim().toUpperCase();
        if (!key) continue;
        this.productosMap.set(key, p);
      }

      this.totalProductos = this.productosMap.size;

      this.archivosCargados = [this.CSV_NAME];

      this.mensaje =
        'Sin conexión. Usando última lista guardada.';
    } catch {
      this.mensaje = 'Error leyendo datos guardados.';
    }
  }



  private async descargarCsv(url: string): Promise<string> {
    // cache busting: cada carga pide el CSV del deploy actual
    const res = await fetch(`${url}?v=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) throw new Error('No se pudo leer ' + url);
    return await res.text();
  }

  private parseCsvTextYGuardarEnMap(csvText: string): Promise<void> {
    return new Promise((resolve, reject) => {
      Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        complete: (result) => {
          try {
            const rows = (result.data as any[]).map((r) => this.normalizeRow(r));

            this.productosMap.clear();
            for (const p of rows) {
              if (!p.codigo || !p.producto) continue;
              const key = p.codigo.trim().toUpperCase();
              if (!key) continue;
              this.productosMap.set(key, p);
            }

            resolve();
          } catch (e) {
            reject(e);
          }
        },
        error: (err: unknown) => reject(err),
      });
    });
  }

  // ---------- Búsqueda ----------
  buscarYAgregar() {
    this.mensaje = '';

    const code = this.codigoBuscado.trim().toUpperCase();
    if (!code) {
      this.mensaje = 'Ingresá un código.';
      return;
    }
    if (this.productosMap.size === 0) {
      this.mensaje = 'No hay productos cargados.';
      return;
    }

    const prod = this.productosMap.get(code);
    if (!prod) {
      this.mensaje = `No se encontró el código: ${code}`;
      return;
    }

    const yaAgregado = this.seleccionados.some((p) => p.codigo.toUpperCase() === code);
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
    this.seleccionados = this.seleccionados.filter((x) => x.codigo.trim().toUpperCase() !== code);
  }

  vaciar() {
    this.seleccionados = [];
  }

  get totalSinIva(): number {
    return this.seleccionados.reduce((acc, p) => acc + (p.precio_c_iva || 0), 0);
  }

  // ---------- Normalización ----------
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
      precio_c_iva: toNumber(r.precio_c_iva),
    };
  }

  // ---------- Local Storage ----------
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
      localStorage.removeItem(this.LS_PRODUCTOS);
    }
  }

  private guardarArchivosEnLocalStorage() {
    localStorage.setItem(this.LS_ARCHIVOS, JSON.stringify(this.archivosCargados));
  }

  private cargarArchivosDesdeLocalStorage() {
    const raw = localStorage.getItem(this.LS_ARCHIVOS);
    if (!raw) return;

    try {
      this.archivosCargados = JSON.parse(raw);
    } catch {
      localStorage.removeItem(this.LS_ARCHIVOS);
    }
  }

  borrarProductosCargados() {
    localStorage.removeItem(this.LS_PRODUCTOS);
    localStorage.removeItem(this.LS_ARCHIVOS);

    this.productosMap.clear();
    this.totalProductos = 0;
    this.archivosCargados = [];
    this.mensaje = 'Piezas cargadas borradas.';
  }

  // Opcional: forzar recarga desde el repo aunque exista localStorage
  async recargarLista() {
    this.borrarProductosCargados();
    await this.cargarDesdeRepoYGuardar();
  }
}

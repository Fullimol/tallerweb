import { Routes } from '@angular/router';

export const routes: Routes = [
  // Home (tu productos-page)
  {
    path: '',
    loadComponent: () =>
      import('./pages/productos-page/productos-page').then(m => m.ProductosPage),
  },

  // Lista completa
  {
    path: 'lista-page',
    loadComponent: () =>
      import('./pages/lista-page/lista-page').then(m => m.ListaPage),
  },

  // Cualquier otra ruta -> vuelve al home (opcional pero recomendado)
  { path: '**', redirectTo: '' },
];

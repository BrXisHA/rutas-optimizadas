# 🚚 Despachos Rápidos — PWA de Optimización de Rutas

Aplicación Web Progresiva (PWA) Mobile-First para repartidores.  
Calcula matemáticamente la ruta óptima priorizando paquetes urgentes.

---

## ⚡ Inicio Rápido

```bash
npm install
npm run dev
```

La app queda disponible en **http://localhost:5173**

---

## 🔑 Configurar API Keys

### 1. OpenRouteService (ORS) — Motor de optimización

1. Regístrate **gratis** en [openrouteservice.org](https://openrouteservice.org/dev/#/signup)
2. En tu Dashboard, crea un **Token** (capa gratuita: 2,000 req/día)
3. Abre `src/utils/api.js` y reemplaza el valor de `ORS_API_KEY`:

```js
export const ORS_API_KEY = "TU_API_KEY_AQUI";
```

> ⚠️ **Nominatim** (geocodificación) es de uso libre,  
> no requiere API key. Se respeta el rate-limit de 1 req/s.

---

## 📱 Flujo de Uso

1. **Configura el almacén** (Pestaña Pedidos → sección superior)  
   → Escribe la dirección y presiona "Guardar almacén"  
   → El sistema la geocodifica automáticamente

2. **Agrega pedidos**  
   → Nombre del cliente + dirección completa  
   → Marca "🔥 Paquete Urgente" si aplica (priority 100 en ORS)

3. **Optimiza la ruta**  
   → Presiona el botón verde "Optimizar ruta"  
   → Se geocodifican las direcciones (1s de delay entre cada una)  
   → ORS calcula la secuencia óptima

4. **Navega en campo** (Pestaña Ruta)  
   → Mapa interactivo con la polilínea de la ruta  
   → Botones **Waze** y **Google Maps** por parada  
   → Marca cada entrega como ✅ completada

5. **Revisa el historial** (Pestaña Historial)  
   → Las rutas pasadas se guardan en `localStorage`  
   → Persiste entre recargas de página

---

## 🏗️ Stack Tecnológico

| Capa            | Tecnología                        |
| --------------- | --------------------------------- |
| UI Framework    | React 19 + Vite 7                 |
| Estilos         | Tailwind CSS v4                   |
| Iconos          | Lucide React                      |
| Mapas           | Leaflet.js (carga dinámica)       |
| PWA             | vite-plugin-pwa + Workbox         |
| Geocodificación | Nominatim (OpenStreetMap)         |
| Optimización    | OpenRouteService Optimization API |
| Persistencia    | localStorage del navegador        |

---

## 📂 Estructura del Proyecto

```
src/
├── components/
│   ├── ConfigAlmacen.jsx   # Formulario del almacén + geocodificación
│   ├── FormPedido.jsx       # Formulario de nuevo pedido
│   ├── Historial.jsx        # Lista del historial de rutas
│   ├── ListaPedidos.jsx     # Lista pendiente + lista ruta activa
│   ├── RouteMap.jsx         # Mapa Leaflet + marcadores + polilínea
│   └── Toast.jsx            # Notificaciones temporales
├── hooks/
│   └── useAppState.js       # Estado global + persistencia localStorage
├── utils/
│   └── api.js               # Geocodificación, ORS, decodificación, URLs
├── App.jsx                  # Componente raíz + lógica de optimización
├── main.jsx                 # Entrada de React
└── index.css                # Design system + componentes CSS
```

---

## 🌐 Deploy como PWA

```bash
npm run build
```

El directorio `dist/` contiene la PWA lista para desplegar en  
**Netlify**, **Vercel**, **GitHub Pages** o cualquier servidor estático.

La PWA se puede instalar en Android/iOS desde el navegador.

---

## ⚠️ Restricciones conocidas

- **Nominatim prohíbe ráfagas**: el delay de 1.1s está hardcodeado.  
  Para muchos pedidos (>20), la geocodificación puede tardar ~20s.  
  Considera usar Google Geocoding API si necesitas velocidad.
- **ORS Free tier**: 2,000 optimizaciones/día.  
  Más que suficiente para uso individual.
- **100% client-side**: las API keys quedan expuestas en el bundle.  
  Para producción multiusuario, añade un proxy serverless.

import { useEffect, useRef, useState } from 'react'
import { decodePolyline } from '../utils/api'

// Leaflet se importa dinámicamente para evitar errores SSR
let L = null

export default function RouteMap({ rutaActiva, almacenCoords }) {
  const mapRef    = useRef(null)
  const mapInst   = useRef(null)
  const layersRef = useRef([])
  const [leafletReady, setLeafletReady] = useState(false)

  // Carga Leaflet de forma dinámica
  useEffect(() => {
    import('leaflet').then((mod) => {
      L = mod.default
      // Fix para íconos en bundlers
      delete L.Icon.Default.prototype._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })
      setLeafletReady(true)
    })
  }, [])

  // Inicializa el mapa cuando Leaflet esté listo
  useEffect(() => {
    if (!leafletReady || !mapRef.current || mapInst.current) return

    mapInst.current = L.map(mapRef.current, {
      center: [16.77146959206133, -93.19299112393828], // Coordenadas del almacén
      zoom: 13,
      zoomControl: true,
    })

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(mapInst.current)
  }, [leafletReady])

  // Redibujar cuando cambia la ruta
  useEffect(() => {
    if (!mapInst.current || !leafletReady || !L) return

    // Limpia capas anteriores
    layersRef.current.forEach((l) => mapInst.current.removeLayer(l))
    layersRef.current = []

    if (!rutaActiva) return

    const bounds = []

    // Marcador del almacén
    if (almacenCoords) {
      const warehouseIcon = L.divIcon({
        html: `<div style="background:linear-gradient(135deg,#7c3aed,#a78bfa);width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 0 12px rgba(124,58,237,0.6);font-size:14px;">🏭</div>`,
        className: '',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      })
      const m = L.marker([almacenCoords[1], almacenCoords[0]], { icon: warehouseIcon })
        .addTo(mapInst.current)
        .bindPopup('<b>🏭 Almacén</b><br>Punto de inicio y fin')
      layersRef.current.push(m)
      bounds.push([almacenCoords[1], almacenCoords[0]])
    }

    // Marcadores de paradas
    rutaActiva.paradas.forEach((parada, idx) => {
      if (!parada.coords) return
      const [lon, lat] = parada.coords
      const isUrgent = parada.isUrgent
      const color = isUrgent ? '#f97316' : '#7c3aed'
      const stopIcon = L.divIcon({
        html: `<div style="background:${color};width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid white;box-shadow:0 0 10px ${color}99;color:white;font-weight:800;font-size:12px;">${idx + 1}</div>`,
        className: '',
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      })
      const m = L.marker([lat, lon], { icon: stopIcon })
        .addTo(mapInst.current)
        .bindPopup(`
          <div style="min-width:160px">
            <b>${isUrgent ? '🔥 URGENTE - ' : ''}${parada.nombre}</b><br>
            <small style="color:#888">${parada.direccion}</small>
          </div>
        `)
      layersRef.current.push(m)
      bounds.push([lat, lon])
    })

    // Polilínea de la ruta
    if (rutaActiva.geometry) {
      const coords = decodePolyline(rutaActiva.geometry)
      if (coords.length > 0) {
        const poly = L.polyline(coords, {
          color: '#7c3aed',
          weight: 4,
          opacity: 0.85,
          dashArray: null,
          lineJoin: 'round',
        }).addTo(mapInst.current)
        layersRef.current.push(poly)
      }
    }

    // Ajusta el zoom para ver todos los puntos
    if (bounds.length > 0) {
      mapInst.current.fitBounds(L.latLngBounds(bounds), { padding: [30, 30] })
    }
  }, [rutaActiva, almacenCoords, leafletReady])

  if (!leafletReady) {
    return (
      <div className="map-placeholder">
        <div className="spin" style={{ fontSize: '1.5rem' }}>⏳</div>
        <span>Cargando mapa…</span>
      </div>
    )
  }

  return (
    <div
      ref={mapRef}
      className="map-wrap"
      style={{ zIndex: 0 }}
    />
  )
}

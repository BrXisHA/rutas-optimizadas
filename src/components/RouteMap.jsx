// RouteMap.jsx — simplificado para Despachos Pro
// Ya no se usa ORS ni polilíneas. Este componente no se renderiza
// actualmente en la nueva app (Tab Mis Rutas usa las coords directas).
// Se mantiene por compatibilidad futura.
import { useEffect, useRef, useState } from 'react'

let L = null

export default function RouteMap({ paradas = [], almacenCoords }) {
  const mapRef    = useRef(null)
  const mapInst   = useRef(null)
  const layersRef = useRef([])
  const [leafletReady, setLeafletReady] = useState(false)

  useEffect(() => {
    import('leaflet').then((mod) => {
      L = mod.default
      delete L.Icon.Default.prototype._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })
      setLeafletReady(true)
    })
  }, [])

  useEffect(() => {
    if (!leafletReady || !mapRef.current || mapInst.current) return
    mapInst.current = L.map(mapRef.current, {
      center: [16.77146959206133, -93.19299112393828],
      zoom: 13,
      zoomControl: true,
    })
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
      maxZoom: 19,
    }).addTo(mapInst.current)
  }, [leafletReady])

  useEffect(() => {
    if (!mapInst.current || !leafletReady || !L) return
    layersRef.current.forEach((l) => mapInst.current.removeLayer(l))
    layersRef.current = []

    const bounds = []

    // Almacén
    if (almacenCoords) {
      const [lng, lat] = almacenCoords
      const icon = L.divIcon({
        html: `<div style="background:#9b1c1c;width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 0 10px rgba(155,28,28,0.6);font-size:14px;">🏭</div>`,
        className: '', iconSize: [30, 30], iconAnchor: [15, 15],
      })
      const m = L.marker([lat, lng], { icon })
        .addTo(mapInst.current).bindPopup('<b>🏭 Almacén</b>')
      layersRef.current.push(m)
      bounds.push([lat, lng])
    }

    // Paradas
    paradas.forEach((p, i) => {
      if (!p.lat || !p.lng) return
      const color = p.isUrgente ? '#f59e0b' : '#9b1c1c'
      const icon = L.divIcon({
        html: `<div style="background:${color};width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid white;box-shadow:0 0 8px ${color}99;color:white;font-weight:800;font-size:12px;">${i + 1}</div>`,
        className: '', iconSize: [28, 28], iconAnchor: [14, 14],
      })
      const m = L.marker([p.lat, p.lng], { icon })
        .addTo(mapInst.current)
        .bindPopup(`<b>${p.isUrgente ? '🔥 ' : ''}${p.nombre}</b>`)
      layersRef.current.push(m)
      bounds.push([p.lat, p.lng])
    })

    if (bounds.length > 0) {
      mapInst.current.fitBounds(L.latLngBounds(bounds), { padding: [30, 30] })
    }
  }, [paradas, almacenCoords, leafletReady])

  if (!leafletReady) return (
    <div className="map-placeholder">
      <span>Cargando mapa…</span>
    </div>
  )

  return <div ref={mapRef} className="map-wrap" style={{ zIndex: 0 }} />
}

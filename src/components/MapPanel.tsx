import { MapContainer, Marker, Popup, TileLayer, CircleMarker, useMap } from 'react-leaflet'
import L from 'leaflet'
import { useEffect, useState } from 'react'
import { HK_HOTSPOTS } from '../lib/game'
import type { CodexEntry, GeoPoint } from '../types'

const hkCenter: [number, number] = [22.3193, 114.1694]

type Hotspot = (typeof HK_HOTSPOTS)[number]

const discoveryIcon = new L.DivIcon({
  className: 'yezhi-pin',
  html: `<div class="pin-dot"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
})

function FlyTo({ target }: { target: GeoPoint | null }) {
  const map = useMap()
  useEffect(() => {
    if (!target) return
    map.flyTo([target.lat, target.lng], 13, { duration: 1.15 })
  }, [target, map])
  return null
}

function SpeciesImg({ src, alt }: { src: string; alt: string }) {
  const [ok, setOk] = useState(true)
  if (!ok) return <div className="sp-fallback" aria-hidden />
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      onError={() => setOk(false)}
    />
  )
}

interface MapPanelProps {
  entries: CodexEntry[]
  userLocation: GeoPoint | null
  focus: GeoPoint | null
  onFocusHotspot: (point: GeoPoint) => void
}

export function MapPanel({ entries, userLocation, focus, onFocusHotspot }: MapPanelProps) {
  const [active, setActive] = useState<Hotspot>(HK_HOTSPOTS[0])

  const discoveries = entries.flatMap((e) =>
    e.locations.map((loc, i) => ({
      key: `${e.id}-${i}`,
      loc,
      name: e.candidate.commonNameZh,
    })),
  )

  function selectHotspot(h: Hotspot) {
    setActive(h)
    onFocusHotspot({ lat: h.lat, lng: h.lng })
  }

  return (
    <div className="journal-page map-page">
      <header className="journal-intro">
        <p className="eyebrow">Hong Kong · Field Atlas</p>
        <h2>觀生地圖</h2>
        <p className="lede">選一處地方，認識那裡的常見生命。</p>
      </header>

      <div className="map-stage">
        <div className="map-wrap">
          <MapContainer center={hkCenter} zoom={11} scrollWheelZoom style={{ height: '100%', width: '100%' }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
              url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            />
            <FlyTo target={focus || userLocation} />

            {HK_HOTSPOTS.map((h) => (
              <CircleMarker
                key={h.name}
                center={[h.lat, h.lng]}
                radius={active.name === h.name ? 11 : 7}
                pathOptions={{
                  color: active.name === h.name ? '#3d6b58' : '#8aa0a8',
                  fillColor: active.name === h.name ? '#3d6b58' : '#b7c6cb',
                  fillOpacity: 0.45,
                  weight: 2,
                }}
                eventHandlers={{ click: () => selectHotspot(h) }}
              >
                <Popup>
                  <div className="map-popup">
                    <strong>{h.name}</strong>
                    <em>{h.hint}</em>
                    <div className="popup-thumbs">
                      {h.species.slice(0, 4).map((s) => (
                        <div key={s.name} className="popup-thumb">
                          <SpeciesImg src={s.image} alt={s.name} />
                        </div>
                      ))}
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            ))}

            {discoveries.map((d) => (
              <Marker key={d.key} position={[d.loc.lat, d.loc.lng]} icon={discoveryIcon}>
                <Popup>你的發現：{d.name}</Popup>
              </Marker>
            ))}

            {userLocation && (
              <CircleMarker
                center={[userLocation.lat, userLocation.lng]}
                radius={8}
                pathOptions={{ color: '#3d6b58', fillColor: '#9fc0b0', fillOpacity: 0.6 }}
              >
                <Popup>你在這裡</Popup>
              </CircleMarker>
            )}
          </MapContainer>
        </div>
      </div>

      <section className="place-journal" key={active.name}>
        <div className="place-hero">
          <div className="place-hero-img">
            <SpeciesImg src={active.cover} alt={active.name} />
          </div>
          <div className="place-hero-copy">
            <p className="place-kicker">{active.hint}</p>
            <h3>{active.name}</h3>
            <p className="place-blurb">{active.blurb}</p>
          </div>
        </div>

        <div className="species-block">
          <div className="species-block-head">
            <h4>常見物種</h4>
            <span>{active.species.length} 種</span>
          </div>
          <div className="species-rail">
            {active.species.map((s) => (
              <article key={s.name} className="species-card">
                <div className="species-card-photo">
                  <SpeciesImg src={s.image} alt={s.name} />
                </div>
                <div className="species-card-meta">
                  <strong>{s.name}</strong>
                  <span>{s.kind}</span>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <div className="place-chips">
        {HK_HOTSPOTS.map((h) => (
          <button
            key={h.name}
            type="button"
            className={`place-chip ${active.name === h.name ? 'active' : ''}`}
            onClick={() => selectHotspot(h)}
          >
            <span className="place-chip-photo">
              <SpeciesImg src={h.cover} alt="" />
            </span>
            <span className="place-chip-text">
              <strong>{h.name}</strong>
              <em>{h.hint}</em>
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

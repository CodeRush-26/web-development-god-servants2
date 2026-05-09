import { useEffect, useMemo, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const MAP_CENTER = [25.9, 57.3];
const TICK_MS = 1000;

function statusColor(status) {
  switch (status) {
    case "normal":
      return "#14b86a";
    case "rerouting":
      return "#f0b429";
    case "distressed":
      return "#e55353";
    case "stopped":
      return "#8f8f8f";
    case "arrived":
      return "#3b82f6";
    default:
      return "#94a3b8";
  }
}

function normalizeHeading(deg) {
  return ((deg % 360) + 360) % 360;
}

function shortestTurn(fromDeg, toDeg) {
  let diff = normalizeHeading(toDeg) - normalizeHeading(fromDeg);
  diff = ((diff + 540) % 360) - 180;
  return diff;
}

function lerpShip(prev, next, t) {
  const headingDelta = shortestTurn(prev.heading, next.heading);
  return {
    ...next,
    lat: prev.lat + (next.lat - prev.lat) * t,
    lng: prev.lng + (next.lng - prev.lng) * t,
    heading: normalizeHeading(prev.heading + headingDelta * t),
  };
}

function shipIcon(heading, status, selected) {
  const color = statusColor(status);
  const ringColor = selected ? "#ffffff" : "transparent";
  return L.divIcon({
    className: "",
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    html: `
      <div style="position:relative; width:26px; height:26px;">
        <div style="transform: rotate(${heading}deg); width:26px; height:26px; display:flex; align-items:center; justify-content:center;">
          <div style="width:0; height:0; border-left:7px solid transparent; border-right:7px solid transparent; border-bottom:16px solid ${color}; filter: drop-shadow(0 1px 1px rgba(0,0,0,.35));"></div>
        </div>
        <div style="position:absolute; inset:0; border-radius:50%; border:2px solid ${ringColor};"></div>
      </div>
    `,
  });
}

function shipPopupHtml(ship) {
  const fuel = Number.isFinite(Number(ship.fuel)) ? Number(ship.fuel) : 0;
  return `
    <div style="min-width:220px; font-family:Inter,system-ui,sans-serif;">
      <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
        <strong>${ship.name}</strong>
        <span style="background:${statusColor(ship.status)}; color:#fff; border-radius:8px; font-size:12px; padding:2px 8px; text-transform:capitalize;">
          ${ship.status}
        </span>
      </div>
      <div style="font-size:13px; line-height:1.4;">
        <div>ID: ${ship.id}</div>
        <div>Speed: ${Number(ship.speed || 0).toFixed(1)} kn</div>
        <div>Heading: ${Math.round(ship.heading || 0)}°</div>
        <div>Destination: ${ship.destination || "Unknown"}</div>
        <div>Cargo: ${ship.cargo || "N/A"}</div>
        <div>Fuel: ${fuel.toFixed(1)}%</div>
      </div>
    </div>
  `;
}

export default function FleetMap({ fleetData, selectedShipId, onSelectShip }) {
  const ships = useMemo(() => {
    const raw = Array.isArray(fleetData?.ships) ? fleetData.ships : [];
    return raw
      .map((ship) => ({
        ...ship,
        lat: Number(ship?.lat),
        lng: Number(ship?.lng),
        heading: Number(ship?.heading || 0),
      }))
      .filter(
        (ship) =>
          ship &&
          typeof ship.id === "string" &&
          Number.isFinite(ship.lat) &&
          Number.isFinite(ship.lng)
      );
  }, [fleetData?.ships]);

  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(new Map());
  const rafRef = useRef(null);
  const prevShipsRef = useRef(new Map());
  const nextShipsRef = useRef(new Map());
  const tickStartRef = useRef(performance.now());

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, { zoomControl: true }).setView(MAP_CENTER, 7);
    L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}", {
      attribution:
        "Tiles &copy; Esri &mdash; Sources: Esri, HERE, Garmin, Intermap, increment P Corp., GEBCO, USGS",
    }).addTo(map);
    mapRef.current = map;
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      map.remove();
      mapRef.current = null;
      markerRef.current.clear();
    };
  }, []);

  useEffect(() => {
    const nextMap = new Map(ships.map((s) => [s.id, s]));
    const prevMap =
      nextShipsRef.current.size > 0 ? nextShipsRef.current : new Map(ships.map((s) => [s.id, s]));
    prevShipsRef.current = prevMap;
    nextShipsRef.current = nextMap;
    tickStartRef.current = performance.now();
  }, [ships]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const animate = () => {
      const t = Math.min(1, (performance.now() - tickStartRef.current) / TICK_MS);
      const idsToKeep = new Set();

      nextShipsRef.current.forEach((nextShip, id) => {
        const prevShip = prevShipsRef.current.get(id) || nextShip;
        const current = lerpShip(prevShip, nextShip, t);
        if (!Number.isFinite(current.lat) || !Number.isFinite(current.lng)) return;

        idsToKeep.add(id);
        let marker = markerRef.current.get(id);
        if (!marker) {
          marker = L.marker([current.lat, current.lng], {
            icon: shipIcon(current.heading, current.status, id === selectedShipId),
          })
            .addTo(map)
            .on("click", () => onSelectShip?.(id));
          markerRef.current.set(id, marker);
        } else {
          marker.setLatLng([current.lat, current.lng]);
          marker.setIcon(shipIcon(current.heading, current.status, id === selectedShipId));
        }
        marker.bindPopup(shipPopupHtml(current));
      });

      markerRef.current.forEach((marker, id) => {
        if (!idsToKeep.has(id)) {
          map.removeLayer(marker);
          markerRef.current.delete(id);
        }
      });

      rafRef.current = requestAnimationFrame(animate);
    };

    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [onSelectShip, selectedShipId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedShipId) return;
    const selected = nextShipsRef.current.get(selectedShipId);
    if (!selected || !Number.isFinite(selected.lat) || !Number.isFinite(selected.lng)) return;
    map.flyTo([selected.lat, selected.lng], Math.max(map.getZoom(), 8), { duration: 0.8 });
  }, [selectedShipId]);

  return <div ref={containerRef} style={{ height: "100vh", width: "100%" }} />;
}


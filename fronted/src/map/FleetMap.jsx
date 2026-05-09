import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import ZoneDrawer from "./ZoneDrawer";
import { renderWeatherLayer } from "./WeatherLayer";

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
  const ringColor = selected ? "#f8fafc" : "transparent";
  return L.divIcon({
    className: "",
    iconSize: [42, 42],
    iconAnchor: [21, 21],
    html: `
      <div style="position:relative; width:42px; height:42px;">
        <div style="transform: rotate(${heading}deg); width:42px; height:42px; display:flex; align-items:center; justify-content:center;">
          <div style="position:relative; width:22px; height:32px; filter: drop-shadow(0 3px 3px rgba(0,0,0,.35));">
            <div style="position:absolute; left:0; right:0; top:2px; margin:auto; width:18px; height:26px; background:${color}; border-radius:10px 10px 6px 6px; clip-path: polygon(50% 0%, 90% 18%, 100% 75%, 50% 100%, 0% 75%, 10% 18%);"></div>
            <div style="position:absolute; left:6px; top:8px; width:10px; height:8px; background:#dbeafe; border:1px solid rgba(255,255,255,.65); border-radius:3px;"></div>
            <div style="position:absolute; left:9px; top:0px; width:4px; height:6px; background:#cbd5e1; border-radius:2px;"></div>
          </div>
        </div>
        <div style="position:absolute; inset:2px; border-radius:50%; border:${selected ? 3 : 2}px solid ${ringColor}; box-shadow:${selected ? "0 0 0 2px rgba(37,99,235,.45)" : "none"};"></div>
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

export default function FleetMap({
  fleetData,
  selectedShipId,
  onSelectShip,
  zones = [],
  role = "captain",
  isDrawingZone = false,
  onStartDrawingZone,
  onFinishDrawingZone,
  onCancelDrawingZone,
  onAddZone,
  onRemoveZone,
  weatherCells = [],
}) {
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
  const zoneLayerRef = useRef(new Map());
  const drawPointsRef = useRef([]);
  const drawLineRef = useRef(null);
  const drawGuideLineRef = useRef(null);
  const drawPointMarkersRef = useRef([]);
  const weatherLayerRef = useRef(null);
  const routeLineRef = useRef(null);
  const [drawPointCount, setDrawPointCount] = useState(0);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, { zoomControl: true }).setView(MAP_CENTER, 7);
    map.createPane("drawPane");
    map.getPane("drawPane").style.zIndex = "750";
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
      zoneLayerRef.current.clear();
      if (weatherLayerRef.current) {
        map.removeLayer(weatherLayerRef.current);
      }
      if (routeLineRef.current) {
        map.removeLayer(routeLineRef.current);
      }
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
    if (!map) return;
    const idsToKeep = new Set();

    (Array.isArray(zones) ? zones : []).forEach((zone) => {
      if (!zone?.id || !Array.isArray(zone?.coords) || zone.coords.length < 3) return;
      const latlngs = zone.coords
        .map((p) => [Number(p?.lat), Number(p?.lng)])
        .filter(([lat, lng]) => Number.isFinite(lat) && Number.isFinite(lng));
      if (latlngs.length < 3) return;

      idsToKeep.add(zone.id);
      let layer = zoneLayerRef.current.get(zone.id);
      if (!layer) {
        layer = L.polygon(latlngs, {
          color: "#dc2626",
          weight: 2,
          dashArray: "6,6",
          fillColor: "#ef4444",
          fillOpacity: 0.15,
        }).addTo(map);
        if (role === "command") {
          layer.on("click", () => {
            if (!window.confirm(`Delete zone ${zone.id}?`)) return;
            onRemoveZone?.(zone.id);
          });
        }
        zoneLayerRef.current.set(zone.id, layer);
      } else {
        layer.setLatLngs(latlngs);
      }
    });

    zoneLayerRef.current.forEach((layer, id) => {
      if (!idsToKeep.has(id)) {
        map.removeLayer(layer);
        zoneLayerRef.current.delete(id);
      }
    });
  }, [zones, role, onRemoveZone]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || role !== "command") return;

    const refreshTempLine = () => {
      const points = drawPointsRef.current;
      if (drawLineRef.current) {
        map.removeLayer(drawLineRef.current);
        drawLineRef.current = null;
      }
      if (drawGuideLineRef.current) {
        map.removeLayer(drawGuideLineRef.current);
        drawGuideLineRef.current = null;
      }
      drawPointMarkersRef.current.forEach((marker) => map.removeLayer(marker));
      drawPointMarkersRef.current = [];

      points.forEach((p) => {
        const marker = L.circleMarker([p.lat, p.lng], {
          pane: "drawPane",
          radius: 7,
          color: "#1e3a8a",
          fillColor: "#60a5fa",
          fillOpacity: 1,
          weight: 2,
        }).addTo(map);
        marker.bindTooltip(`P${drawPointMarkersRef.current.length + 1}`, {
          permanent: true,
          direction: "top",
          offset: [0, -8],
          className: "draw-point-label",
          pane: "drawPane",
        });
        drawPointMarkersRef.current.push(marker);
      });

      if (points.length >= 1) {
        drawLineRef.current = L.polyline(points, {
          pane: "drawPane",
          color: "#2563eb",
          weight: 3,
          dashArray: "4,4",
        }).addTo(map);
      }
    };

    const onMapClick = (e) => {
      if (!isDrawingZone) return;
      drawPointsRef.current.push({ lat: e.latlng.lat, lng: e.latlng.lng });
      setDrawPointCount(drawPointsRef.current.length);
      refreshTempLine();
    };

    const onMapMouseMove = (e) => {
      if (!isDrawingZone) return;
      const points = drawPointsRef.current;
      if (points.length < 1) return;
      const last = points[points.length - 1];
      if (drawGuideLineRef.current) {
        map.removeLayer(drawGuideLineRef.current);
        drawGuideLineRef.current = null;
      }
      drawGuideLineRef.current = L.polyline(
        [
          [last.lat, last.lng],
          [e.latlng.lat, e.latlng.lng],
        ],
        {
          pane: "drawPane",
          color: "#0ea5e9",
          weight: 2,
          dashArray: "3,5",
        }
      ).addTo(map);
    };

    map.on("click", onMapClick);
    map.on("mousemove", onMapMouseMove);
    return () => {
      map.off("click", onMapClick);
      map.off("mousemove", onMapMouseMove);
      if (drawLineRef.current) {
        map.removeLayer(drawLineRef.current);
        drawLineRef.current = null;
      }
      if (drawGuideLineRef.current) {
        map.removeLayer(drawGuideLineRef.current);
        drawGuideLineRef.current = null;
      }
      drawPointMarkersRef.current.forEach((marker) => map.removeLayer(marker));
      drawPointMarkersRef.current = [];
    };
  }, [isDrawingZone, onAddZone, onFinishDrawingZone, role]);

  useEffect(() => {
    const map = mapRef.current;
    if (map) {
      if (isDrawingZone) {
        map.dragging.disable();
        map.doubleClickZoom.disable();
        map.getContainer().style.cursor = "crosshair";
      } else {
        map.dragging.enable();
        map.doubleClickZoom.enable();
        map.getContainer().style.cursor = "";
      }
    }

    if (!isDrawingZone) {
      drawPointsRef.current = [];
      setDrawPointCount(0);
      if (drawLineRef.current && map) {
        map.removeLayer(drawLineRef.current);
        drawLineRef.current = null;
      }
      if (drawGuideLineRef.current && map) {
        map.removeLayer(drawGuideLineRef.current);
        drawGuideLineRef.current = null;
      }
      if (map) {
        drawPointMarkersRef.current.forEach((marker) => map.removeLayer(marker));
      }
      drawPointMarkersRef.current = [];
    }
  }, [isDrawingZone]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedShipId) return;
    const selected = nextShipsRef.current.get(selectedShipId);
    if (!selected || !Number.isFinite(selected.lat) || !Number.isFinite(selected.lng)) return;
    map.flyTo([selected.lat, selected.lng], Math.max(map.getZoom(), 8), { duration: 0.8 });
  }, [selectedShipId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    renderWeatherLayer({ map, cells: weatherCells, layerRef: weatherLayerRef });
  }, [weatherCells]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (routeLineRef.current) {
      map.removeLayer(routeLineRef.current);
      routeLineRef.current = null;
    }
    if (!selectedShipId) return;
    const ship = ships.find((s) => s.id === selectedShipId);
    if (!ship || !Array.isArray(ship.routeWaypoints) || !ship.routeWaypoints.length) return;
    const path = [
      [ship.lat, ship.lng],
      ...ship.routeWaypoints.map((wp) => [Number(wp.lat), Number(wp.lng)]),
    ].filter(([lat, lng]) => Number.isFinite(lat) && Number.isFinite(lng));
    if (path.length < 2) return;
    routeLineRef.current = L.polyline(path, {
      color: "#0ea5e9",
      weight: 3,
      dashArray: "8,6",
      opacity: 0.9,
    }).addTo(map);
  }, [selectedShipId, ships]);

  return (
    <div style={{ position: "relative", height: "100vh", width: "100%" }}>
      <div ref={containerRef} style={{ height: "100vh", width: "100%" }} />
      <ZoneDrawer
        role={role}
        isDrawingZone={isDrawingZone}
        drawPointsCount={drawPointCount}
        onStartDrawing={onStartDrawingZone}
        onFinishDrawing={() => {
          const points = drawPointsRef.current;
          if (points.length >= 3) onAddZone?.(points);
          drawPointsRef.current = [];
          setDrawPointCount(0);
          if (drawLineRef.current && mapRef.current) {
            mapRef.current.removeLayer(drawLineRef.current);
            drawLineRef.current = null;
          }
          if (drawGuideLineRef.current && mapRef.current) {
            mapRef.current.removeLayer(drawGuideLineRef.current);
            drawGuideLineRef.current = null;
          }
          if (mapRef.current) {
            drawPointMarkersRef.current.forEach((marker) => mapRef.current.removeLayer(marker));
          }
          drawPointMarkersRef.current = [];
          onFinishDrawingZone?.();
        }}
        onCancelDrawing={() => {
          drawPointsRef.current = [];
          setDrawPointCount(0);
          onCancelDrawingZone?.();
          if (drawLineRef.current && mapRef.current) {
            mapRef.current.removeLayer(drawLineRef.current);
            drawLineRef.current = null;
          }
          if (drawGuideLineRef.current && mapRef.current) {
            mapRef.current.removeLayer(drawGuideLineRef.current);
            drawGuideLineRef.current = null;
          }
          if (mapRef.current) {
            drawPointMarkersRef.current.forEach((marker) => mapRef.current.removeLayer(marker));
          }
          drawPointMarkersRef.current = [];
        }}
      />
    </div>
  );
}


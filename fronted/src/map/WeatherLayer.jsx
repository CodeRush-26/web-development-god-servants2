import L from "leaflet";

export function renderWeatherLayer({ map, cells = [], layerRef }) {
  if (!map || !layerRef) return;
  if (layerRef.current) {
    map.removeLayer(layerRef.current);
    layerRef.current = null;
  }

  const group = L.layerGroup();
  cells
    .filter((c) => c?.adverse)
    .forEach((c) => {
      const rect = L.rectangle(
        [
          [c.lat - 0.25, c.lng - 0.25],
          [c.lat + 0.25, c.lng + 0.25],
        ],
        {
          color: "#f59e0b",
          weight: 1,
          fillColor: "#f59e0b",
          fillOpacity: 0.18,
        }
      );
      rect.bindTooltip(`Adverse weather\nWind ${Number(c.windSpeed || 0).toFixed(1)} m/s`);
      rect.addTo(group);
    });
  group.addTo(map);
  layerRef.current = group;
}

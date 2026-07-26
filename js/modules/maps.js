/**
 * Google Maps helpers — graceful degradation without API key
 */

export function buildMapEmbedUrl(lat, lng, zoom = 15) {
  if (!lat || !lng) return null;
  return `https://maps.google.com/maps?q=${lat},${lng}&z=${zoom}&output=embed`;
}

export function buildDirectionsUrl(originLat, originLng, destLat, destLng) {
  if (!destLat || !destLng) return null;
  const dest = `${destLat},${destLng}`;
  const origin = originLat && originLng ? `${originLat},${originLng}` : '';
  return origin
    ? `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${dest}&travelmode=walking`
    : `https://www.google.com/maps/dir/?api=1&destination=${dest}&travelmode=walking`;
}

export function renderMapEmbed(container, lat, lng, label = 'Property location') {
  if (!container) return;

  const url = buildMapEmbedUrl(lat, lng);
  if (!url) {
    container.innerHTML = `
      <div class="empty-state" style="height:100%;display:flex;align-items:center;justify-content:center;">
        <p class="text-muted">Map unavailable — location coordinates not provided.</p>
      </div>`;
    return;
  }

  container.innerHTML = `
    <iframe
      class="property-map"
      src="${url}"
      title="${label}"
      loading="lazy"
      referrerpolicy="no-referrer-when-downgrade"
      allowfullscreen>
    </iframe>`;
}

export function initDirectionsButton(btn, originLat, originLng, destLat, destLng) {
  if (!btn) return;

  btn.addEventListener('click', () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const url = buildDirectionsUrl(pos.coords.latitude, pos.coords.longitude, destLat, destLng);
          window.open(url, '_blank');
        },
        () => {
          const url = buildDirectionsUrl(originLat, originLng, destLat, destLng);
          if (url) window.open(url, '_blank');
        }
      );
    } else {
      const url = buildDirectionsUrl(originLat, originLng, destLat, destLng);
      if (url) window.open(url, '_blank');
    }
  });
}

export function getUniversityCoords(university) {
  const coords = {
    'JKUAT': { lat: -1.0984, lng: 37.0144 },
    'UoN': { lat: -1.2797, lng: 36.8172 },
    'KU': { lat: -1.1803, lng: 36.7034 },
    'Strathmore': { lat: -1.3106, lng: 36.8128 },
    'MKU': { lat: -1.0332, lng: 37.0693 },
    'Embu University': { lat: -0.5397, lng: 37.4570 },
  };
  return coords[university] || { lat: -1.2864, lng: 36.8172 };
}

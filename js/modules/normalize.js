/**
 * Normalize API property documents into the card/detail shape used by the UI.
 */
export function normalizeProperty(raw) {
  if (!raw) return null;

  const id = String(raw.id || raw._id || '');
  const mediaImages = raw.media?.images || [];
  const rawImages = Array.isArray(raw.images) ? raw.images : mediaImages;
  const images = rawImages
    .map((img) => (typeof img === 'string' ? img : img?.url || img?.secure_url))
    .filter(Boolean);
  const cover = raw.image || raw.primaryImage || images[0] || '';
  const university =
    typeof raw.university === 'object'
      ? raw.university?.name || raw.university?.slug
      : raw.university;

  const uniCoords = raw.university?.location?.coordinates?.coordinates;
  const propCoords = raw.location?.coordinates?.coordinates;
  const coords = Array.isArray(propCoords) && propCoords.length === 2
    ? { lng: propCoords[0], lat: propCoords[1] }
    : Array.isArray(uniCoords) && uniCoords.length === 2
      ? { lng: uniCoords[0], lat: uniCoords[1] }
      : null;

  const location =
    raw.location?.estate
    || raw.location?.address
    || raw.location?.area
    || raw.location?.city
    || (typeof raw.location === 'string' ? raw.location : '')
    || [raw.area, raw.city].filter(Boolean).join(', ')
    || 'Kenya';

  const distanceKm = raw.distanceFromCampus ?? raw.distance;
  const distance =
    typeof distanceKm === 'number'
      ? `${distanceKm} km`
      : typeof distanceKm === 'string'
        ? distanceKm
        : raw.walkingTimeMinutes
          ? `${raw.walkingTimeMinutes} min walk`
          : '';

  const verified =
    raw.verified === true
    || raw.verification?.status === 'verified'
    || raw.isVerified === true;

  const createdAt = raw.createdAt || raw.publishedAt;
  const isNew = raw.new === true
    || (createdAt && Date.now() - new Date(createdAt).getTime() < 14 * 24 * 60 * 60 * 1000);

  const am = raw.amenities || {};
  const amenityLabels = [];
  if (am.wifi || am.internet) amenityLabels.push('WiFi');
  if (am.water) amenityLabels.push('Water');
  if (am.electricityType) amenityLabels.push(`Electricity (${am.electricityType})`);
  if (am.furnished) amenityLabels.push('Furnished');
  if (am.parking) amenityLabels.push('Parking');
  if (am.laundry) amenityLabels.push('Laundry');
  if (am.kitchen) amenityLabels.push('Kitchen');
  if (am.security || am.cctv || am.guard) amenityLabels.push('Security');
  if (am.pets) amenityLabels.push('Pets allowed');
  if (am.wheelchair) amenityLabels.push('Wheelchair access');
  if (am.genderRestriction && am.genderRestriction !== 'none') {
    amenityLabels.push(`${am.genderRestriction} only`);
  }

  const landlord = raw.landlord || {};
  const landlordName = [landlord.profile?.firstName, landlord.profile?.lastName].filter(Boolean).join(' ')
    || landlord.name
    || 'KampoStay Landlord';
  const landlordPhone = landlord.profile?.phone || raw.contactPhone || '';

  return {
    ...raw,
    id,
    _id: id,
    title: raw.title || 'Student accommodation',
    description: raw.description || '',
    rent: Number(raw.rent || 0),
    deposit: Number(raw.deposit || raw.rent || 0),
    roomType: raw.roomType || raw.type || '',
    university: university || '',
    location,
    distance,
    walkingTimeMinutes: raw.walkingTimeMinutes || null,
    image: cover,
    images: images.length ? images : [cover],
    verified,
    featured: Boolean(raw.featured),
    new: isNew,
    slug: raw.slug || id,
    amenityLabels: amenityLabels.length ? amenityLabels : ['Water', 'Security'],
    houseRules: Array.isArray(raw.houseRules) && raw.houseRules.length
      ? raw.houseRules
      : ['No loud music after 10 PM', 'Visitors must sign in', 'Rent due by 5th of each month'],
    emergencyContacts: raw.emergencyContacts || [],
    nearbyFacilities: raw.nearbyFacilities || [],
    landlordName,
    landlordPhone,
    landlordEmail: landlord.email || '',
    landlordVerified: Boolean(landlord.verification?.adminApproved || landlord.verification?.email?.verified),
    coords,
  };
}

export function normalizeProperties(list) {
  if (!Array.isArray(list)) return [];
  return list.map(normalizeProperty).filter(Boolean);
}

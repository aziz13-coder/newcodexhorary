import { cleanMoonText } from './cleanMoonText';

export function buildChartPayload(chart, includeVerdict = true) {
  const utcTime = chart?.chart_data?.timezone_info?.utc_time;
  const timezone = chart?.chart_data?.timezone_info?.timezone || 'UTC';
  const instant = utcTime ? new Date(utcTime) : new Date(chart.timestamp);
  const asked_at_utc = instant.toISOString();
  const asked_at_local = instant.toLocaleString('en-US', { timeZone: timezone });

  const getLocationData = () => {
    if (chart.chart_data?.location?.city && chart.chart_data?.location?.city !== 'Unknown') {
      return {
        city: chart.chart_data.location.city,
        country: chart.chart_data.location.country || 'Unknown',
        lat: chart.chart_data.location.latitude || chart.chart_data.location.lat || 0,
        lon: chart.chart_data.location.longitude || chart.chart_data.location.lon || 0
      };
    }

    if (chart.chart_data?.timezone_info?.location && typeof chart.chart_data.timezone_info.location === 'object') {
      const loc = chart.chart_data.timezone_info.location;
      return {
        city: loc.city || loc.name || 'Unknown',
        country: loc.country || 'Unknown',
        lat: loc.latitude || loc.lat || 0,
        lon: loc.longitude || loc.lon || 0
      };
    }

    if (chart.chart_data?.timezone_info?.location_name &&
        chart.chart_data.timezone_info.location_name !== 'Unknown location' &&
        chart.chart_data.timezone_info.location_name !== 'Unknown') {
      const locationStr = chart.chart_data.timezone_info.location_name;
      const parts = locationStr.split(',').map(s => s.trim());
      return {
        city: parts[0] || locationStr,
        country: parts[1] || 'Unknown',
        lat: chart.chart_data.timezone_info?.coordinates?.latitude || 0,
        lon: chart.chart_data.timezone_info?.coordinates?.longitude || 0
      };
    }

    if (chart.location_name && chart.location_name !== 'Unknown location' && chart.location_name !== 'Unknown') {
      const locationStr = chart.location_name;
      const parts = locationStr.split(',').map(s => s.trim());
      return {
        city: parts[0] || locationStr,
        country: parts[1] || 'Unknown',
        lat: chart.chart_data?.timezone_info?.coordinates?.latitude || 0,
        lon: chart.chart_data?.timezone_info?.coordinates?.longitude || 0
      };
    }

    if (chart.location && typeof chart.location === 'object') {
      return {
        city: chart.location.city || 'Unknown',
        country: chart.location.country || 'Unknown',
        lat: chart.location.latitude || chart.location.lat || 0,
        lon: chart.location.longitude || chart.location.lon || 0
      };
    }

    if (typeof chart.location === 'string' && chart.location !== 'Unknown') {
      const parts = chart.location.split(',').map(s => s.trim());
      return {
        city: parts[0] || chart.location,
        country: parts[1] || 'Unknown',
        lat: 0,
        lon: 0
      };
    }

    const tz = chart.chart_data?.timezone_info?.timezone;
    if (tz && tz !== 'UTC' && tz.includes('/')) {
      const parts = tz.split('/');
      const city = parts[parts.length - 1].replace(/_/g, ' ');
      return {
        city,
        country: parts[0] || 'Unknown',
        lat: 0,
        lon: 0
      };
    }

    return {
      city: 'Unknown',
      country: 'Unknown',
      lat: 0,
      lon: 0
    };
  };

  const rationaleList = chart.rationale || chart.reasoning || [];
  const ledgerEntries = chart.ledger || null;

  const payload = {
    id: chart.id,
    question: chart.question,
    category: chart.tags?.[0] || 'general',
    asked_at_local,
    asked_at_utc,
    tz: timezone,
    location: getLocationData(),
    house_system: 'Regiomontanus',
    houses: chart.chart_data?.houses || {},
    rulers: chart.chart_data?.rulers || {},
    aspects: chart.chart_data?.aspects || [],
    planets: chart.chart_data?.planets || {},
    traditional_factors: chart.traditional_factors || {},
    solar_factors: chart.solar_factors || {},
    reasoning: ledgerEntries || rationaleList,
  };

  if (ledgerEntries) {
    payload.ledger = ledgerEntries;
  }

  if (includeVerdict) {
    const keyTestimonies = (chart.rationale || chart.reasoning || [])
      ?.filter(r => r.includes('perfection') || r.includes('reception') || r.includes('Moon') || r.includes('dignity') || r.includes('applying'))
      ?.slice(0, 5)
      ?.map(r => `• ${cleanMoonText(r)}`) || [];

    payload.verdict = {
      label: chart.judgment,
      confidence: chart.confidence,
      rationale: rationaleList.map(r => cleanMoonText(r))
    };
    payload.key_testimonies = keyTestimonies;
    payload.keyTestimoniesText = keyTestimonies.join('\n');
  }

  return payload;
}

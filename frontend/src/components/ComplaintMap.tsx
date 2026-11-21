'use client';

import React, { useEffect, useState } from 'react';
import { Complaint } from '@/types';

interface ComplaintMapProps {
  complaints?: Complaint[];
  selectedLocation?: { lat: number; lng: number } | null;
  onSelectLocation?: (coords: { lat: number; lng: number }) => void;
  interactiveSelect?: boolean;
  center?: [number, number];
  zoom?: number;
  height?: string;
}

export default function ComplaintMap({
  complaints = [],
  selectedLocation,
  onSelectLocation,
  interactiveSelect = false,
  center = [12.6582, 77.4521], // Ramanagara / Bengaluru Rural Gram Panchayat Coordinates
  zoom = 13,
  height = '400px',
}: ComplaintMapProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [MapComponents, setMapComponents] = useState<any>(null);

  useEffect(() => {
    setIsMounted(true);
    // Dynamically import Leaflet and react-leaflet on client
    Promise.all([
      import('leaflet'),
      import('react-leaflet')
    ]).then(([L, RL]) => {
      // Fix default Leaflet icon paths in Next.js bundler
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      setMapComponents({
        MapContainer: RL.MapContainer,
        TileLayer: RL.TileLayer,
        Marker: RL.Marker,
        Popup: RL.Popup,
        useMapEvents: RL.useMapEvents,
        L,
      });
    });
  }, []);

  if (!isMounted || !MapComponents) {
    return (
      <div
        className="w-full flex items-center justify-center bg-slate-100 rounded-xl border border-slate-200 text-slate-500"
        style={{ height }}
      >
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-4 border-gov-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-medium">Loading GramSeva GIS Map...</span>
        </div>
      </div>
    );
  }

  const { MapContainer, TileLayer, Marker, Popup, useMapEvents, L } = MapComponents;

  // Custom colored marker icons for complaint statuses
  const getStatusIcon = (status: string) => {
    let color = '#2563eb'; // blue
    if (status === 'Under Review') color = '#9333ea';
    if (status === 'Assigned') color = '#d97706';
    if (status === 'In Progress') color = '#ea580c';
    if (status === 'Resolved') color = '#059669';
    if (status === 'Rejected') color = '#dc2626';

    const svgHtml = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}" width="32" height="32" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 0 1 0-5 2.5 2.5 0 0 1 0 5z"/>
      </svg>
    `;

    return L.divIcon({
      html: svgHtml,
      className: 'custom-leaflet-marker',
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      popupAnchor: [0, -32],
    });
  };

  // Click handler component for selecting location
  function LocationMarker() {
    useMapEvents({
      click(e: any) {
        if (interactiveSelect && onSelectLocation) {
          onSelectLocation({ lat: e.latlng.lat, lng: e.latlng.lng });
        }
      },
    });

    if (!selectedLocation) return null;

    return (
      <Marker position={[selectedLocation.lat, selectedLocation.lng]}>
        <Popup>
          <div className="text-xs p-1">
            <p className="font-semibold text-slate-800">Selected Location</p>
            <p className="text-slate-600">
              {selectedLocation.lat.toFixed(4)}, {selectedLocation.lng.toFixed(4)}
            </p>
          </div>
        </Popup>
      </Marker>
    );
  }

  return (
    <div className="w-full rounded-xl overflow-hidden border border-slate-200 shadow-sm relative z-0" style={{ height }}>
      <MapContainer
        center={selectedLocation ? [selectedLocation.lat, selectedLocation.lng] : center}
        zoom={zoom}
        scrollWheelZoom={false}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {interactiveSelect && <LocationMarker />}

        {/* Admin Complaints Plotted */}
        {!interactiveSelect &&
          complaints
            .filter((c) => c.latitude && c.longitude)
            .map((c) => (
              <Marker
                key={c.id}
                position={[c.latitude!, c.longitude!]}
                icon={getStatusIcon(c.status)}
              >
                <Popup>
                  <div className="p-1 min-w-[200px]">
                    <div className="flex items-center justify-between gap-2 border-b pb-1 mb-2">
                      <span className="font-bold text-xs text-gov-primary">{c.tracking_id}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold bg-slate-100 text-slate-700">
                        {c.status}
                      </span>
                    </div>
                    <p className="font-semibold text-xs text-slate-900 mb-1">{c.category}</p>
                    <p className="text-[11px] text-slate-600 line-clamp-2 mb-2">{c.description}</p>
                    <div className="text-[10px] text-slate-500">
                      📍 {c.village_name}, {c.ward_number}
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
      </MapContainer>
    </div>
  );
}

export type BasemapContract = {
  id: string;
  label: string;
  styleUrl: string;
  provider: string;
  providerUrl: string;
  attribution: string;
  licenseNote: string;
  role: "context_only";
};

export const basemaps: BasemapContract[] = [
  {
    id: "openfreemap-liberty",
    label: "OpenFreeMap Liberty",
    styleUrl: "https://tiles.openfreemap.org/styles/liberty",
    provider: "OpenFreeMap",
    providerUrl: "https://openfreemap.org/",
    attribution: "OpenStreetMap contributors · OpenFreeMap",
    licenseNote: "Contextual basemap. OpenStreetMap-derived data is subject to ODbL attribution requirements.",
    role: "context_only",
  },
  {
    id: "openfreemap-fiord",
    label: "OpenFreeMap Fiord",
    styleUrl: "https://tiles.openfreemap.org/styles/fiord",
    provider: "OpenFreeMap",
    providerUrl: "https://openfreemap.org/",
    attribution: "OpenStreetMap contributors · OpenFreeMap",
    licenseNote: "Contextual dark basemap. It is not an authority for DISHA administrative-boundary truth.",
    role: "context_only",
  },
];

export function getOperationalBasemap(): BasemapContract {
  const configured = process.env.NEXT_PUBLIC_DISHA_BASEMAP_STYLE_URL?.trim();
  if (configured) {
    return {
      id: "configured",
      label: "Configured operational basemap",
      styleUrl: configured,
      provider: process.env.NEXT_PUBLIC_DISHA_BASEMAP_PROVIDER?.trim() || "Configured provider",
      providerUrl: process.env.NEXT_PUBLIC_DISHA_BASEMAP_PROVIDER_URL?.trim() || configured,
      attribution: process.env.NEXT_PUBLIC_DISHA_BASEMAP_ATTRIBUTION?.trim() || "Basemap attribution required",
      licenseNote: "Configured by deployment. Administrative boundaries remain governed by the DISHA geodata registry.",
      role: "context_only",
    };
  }
  return basemaps[1]!;
}

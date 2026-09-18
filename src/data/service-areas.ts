import type { County } from "./types";

/**
 * The one file for location data. It feeds the service-area section and page,
 * the footer, the county and pickup-area dropdowns in the application form,
 * and structured data. Metro Atlanta only — never add anything outside it.
 */
export const counties: County[] = [
  {
    id: "gwinnett",
    name: "Gwinnett County",
    primary: true,
    cities: [
      { name: "Lawrenceville", primary: true },
      { name: "Duluth", primary: false },
      { name: "Norcross", primary: false },
      { name: "Lilburn", primary: false },
      { name: "Snellville", primary: false },
      { name: "Suwanee", primary: false },
      { name: "Buford", primary: false },
    ],
  },
  {
    id: "fulton",
    name: "Fulton County",
    primary: true,
    cities: [
      { name: "Atlanta", primary: true },
      { name: "Sandy Springs", primary: false },
      { name: "College Park", primary: false },
      { name: "East Point", primary: false },
    ],
  },
  {
    id: "dekalb",
    name: "DeKalb County",
    primary: false,
    cities: [
      { name: "Decatur", primary: false },
      { name: "Tucker", primary: false },
      { name: "Stone Mountain", primary: false },
    ],
  },
  {
    id: "cobb",
    name: "Cobb County",
    primary: false,
    cities: [
      { name: "Marietta", primary: false },
      { name: "Smyrna", primary: false },
    ],
  },
  {
    id: "clayton",
    name: "Clayton County",
    primary: false,
    cities: [
      { name: "Jonesboro", primary: false },
      { name: "Forest Park", primary: false },
      { name: "Riverdale", primary: false },
    ],
  },
];

export const serviceAreaCopy = {
  headline: "Work Car Rentals Across Metro Atlanta",
  body: "ATL Work Cars serves drivers throughout Gwinnett County, Atlanta, and surrounding Metro Atlanta communities.",
  trustLine: "Serving Gwinnett County, Atlanta, and surrounding Metro Atlanta communities.",
  limits:
    "Our service area is limited to Metro Atlanta. If you live or work outside the counties listed here, contact us before applying.",
} as const;

/** Every city name, primary cities first. */
export const allCities: string[] = [
  ...counties.flatMap((c) => c.cities.filter((city) => city.primary).map((city) => city.name)),
  ...counties.flatMap((c) => c.cities.filter((city) => !city.primary).map((city) => city.name)),
];

export const OTHER_METRO_COUNTY = "Other Metro Atlanta county";
export const OUTSIDE_METRO = "Outside Metro Atlanta";

/** Options for the application form's County dropdown. */
export const countyOptions: string[] = [
  ...counties.map((c) => c.name),
  OTHER_METRO_COUNTY,
  OUTSIDE_METRO,
];

/** Options for the application form's optional pickup-area dropdown. */
export const pickupAreaOptions: string[] = ["No preference", ...allCities];

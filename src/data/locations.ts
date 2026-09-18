import type { FaqItem } from "./types";

/**
 * Local SEO pages. The architecture supports every slug below, but a page is
 * only PUBLISHED when it has genuinely unique local copy and its own FAQs.
 * Unpublished slugs return 404 and stay out of the sitemap.
 *
 * To publish another city: add its `content` and set `published: true`.
 * Never copy one city's text into another — near-duplicate pages hurt the set.
 */

export interface LocationContent {
  /** Complete <title>; no template appends the brand. */
  title: string;
  description: string;
  h1: string;
  intro: string[];
  /** Heading + paragraphs about driving for work in this area. */
  localSection: { heading: string; paragraphs: string[] };
  nearby: string[];
  faqs: FaqItem[];
}

export interface LocationPage {
  slug: string;
  name: string;
  published: boolean;
  content: LocationContent | null;
}

export const locations: LocationPage[] = [
  {
    slug: "atlanta",
    name: "Atlanta",
    published: true,
    content: {
      title: "Weekly Car Rental Atlanta for Rideshare & Delivery Drivers | ATL Work Cars",
      description:
        "Work car rental in Atlanta: weekly vehicle rentals for rideshare, food delivery and courier drivers in the city and across Metro Atlanta. Apply online in minutes.",
      h1: "Weekly Work Car Rentals in Atlanta",
      intro: [
        "Driving for work in Atlanta means long days on the Downtown Connector, I-285 and surface streets from Midtown to the southside. If you don't own a car — or the one you have can't keep up — ATL Work Cars rents vehicles by the week so you can keep earning.",
        "We're a local work car rental company for rideshare drivers, delivery drivers and gig workers across the city and the wider Metro Atlanta area.",
      ],
      localSection: {
        heading: "Built for driving in the city",
        paragraphs: [
          "City work is stop-and-start: short restaurant runs in dense neighborhoods, passenger trips between downtown, Midtown and Buckhead, and package routes that wind through residential streets. A practical, fuel-conscious car makes that kind of day easier.",
          "Tell us what kind of work you do on your application and we'll match you with a vehicle that fits it. Pickup details are confirmed with you after approval.",
        ],
      },
      nearby: ["Sandy Springs", "College Park", "East Point", "Decatur", "Smyrna", "Forest Park"],
      faqs: [
        {
          question: "Do I have to live inside the Atlanta city limits to rent?",
          answer:
            "No. We serve drivers across Metro Atlanta, including Fulton, DeKalb, Cobb, Clayton and Gwinnett counties. Choose your county on the application.",
        },
        {
          question: "Can I use a rental car for rideshare trips in Atlanta?",
          answer:
            "Vehicles may be used on compatible rideshare platforms. Each platform sets its own vehicle and driver requirements, and renting from ATL Work Cars does not guarantee acceptance onto any platform.",
        },
        {
          question: "Where in Atlanta do I pick up the car?",
          answer:
            "The pickup location and time are confirmed with you after your application is approved. You can tell us your preferred pickup area on the application.",
        },
      ],
    },
  },
  {
    slug: "lawrenceville",
    name: "Lawrenceville",
    published: true,
    content: {
      title: "Delivery Driver Car Rental Lawrenceville GA | Weekly Work Cars | ATL Work Cars",
      description:
        "Weekly work car rental in Lawrenceville, GA for delivery, rideshare and courier drivers. Local service in the Gwinnett County seat. Apply online in minutes.",
      h1: "Weekly Work Car Rentals in Lawrenceville, GA",
      intro: [
        "Lawrenceville is the county seat of Gwinnett County and sits at the heart of our service area. If you need a car to do delivery, rideshare or courier work here, ATL Work Cars rents vehicles by the week so you can start earning without buying a car.",
        "Many of our applicants live and work in and around Lawrenceville, so Gwinnett is where our attention is strongest.",
      ],
      localSection: {
        heading: "Working the Lawrenceville area",
        paragraphs: [
          "Work here often means shopping-center runs along GA-316 and US-29, residential delivery routes through the surrounding subdivisions, and trips out toward Snellville, Lilburn, Duluth and the I-85 corridor. That's a lot of miles in a week, and a dependable car matters.",
          "Apply online, tell us how soon you need a vehicle, and choose Lawrenceville as your preferred pickup area. We'll confirm availability and pickup details after approval.",
        ],
      },
      nearby: ["Snellville", "Lilburn", "Duluth", "Suwanee", "Buford", "Norcross"],
      faqs: [
        {
          question: "Is Lawrenceville inside your service area?",
          answer:
            "Yes. Lawrenceville and the rest of Gwinnett County are our primary focus.",
        },
        {
          question: "Can I use the car for delivery work in Lawrenceville?",
          answer:
            "Yes, vehicles may be used for food delivery, grocery delivery and courier work on compatible platforms. You're responsible for your own eligibility with each platform.",
        },
        {
          question: "How soon can I get a car in Lawrenceville?",
          answer:
            "It depends on how quickly your application is reviewed and which vehicles are available. Tell us your timeline on the application and we'll let you know what's possible.",
        },
      ],
    },
  },
  {
    slug: "gwinnett-county",
    name: "Gwinnett County",
    published: true,
    content: {
      title: "Weekly Car Rental Gwinnett County | Rideshare & Delivery Cars | ATL Work Cars",
      description:
        "Rideshare and delivery car rental in Gwinnett County: weekly work cars for drivers in Lawrenceville, Duluth, Norcross, Lilburn, Snellville, Suwanee and Buford.",
      h1: "Weekly Work Car Rentals in Gwinnett County",
      intro: [
        "Gwinnett County is our home base and our primary focus. From Lawrenceville and Snellville to Duluth, Norcross, Suwanee and Buford, ATL Work Cars rents vehicles by the week to people who need a car to earn a living.",
        "Whether you drive rideshare, deliver food or groceries, or run courier and package routes, a weekly rental lets you work without taking on a car loan.",
      ],
      localSection: {
        heading: "A county built around the car",
        paragraphs: [
          "Gwinnett is spread out. Deliveries and passenger trips run along I-85, I-985, Peachtree Industrial Boulevard, GA-316 and US-29, with long stretches between stops. Drivers here cover real distance every week, so a practical, dependable vehicle is part of the job.",
          "Pick the Gwinnett city closest to you as your preferred pickup area when you apply. We'll confirm the details after approval.",
        ],
      },
      nearby: ["Lawrenceville", "Duluth", "Norcross", "Lilburn", "Snellville", "Suwanee", "Buford"],
      faqs: [
        {
          question: "Which Gwinnett County cities do you serve?",
          answer:
            "Lawrenceville, Duluth, Norcross, Lilburn, Snellville, Suwanee and Buford, along with surrounding Gwinnett communities.",
        },
        {
          question: "Can I rent in Gwinnett if I work in Atlanta?",
          answer:
            "Yes. Our service area covers Metro Atlanta, so you can live in Gwinnett and drive across the metro area.",
        },
        {
          question: "Do I need to own a car already?",
          answer:
            "No. Most of our renters don't own a car — that's why they rent from us.",
        },
      ],
    },
  },
  { slug: "duluth", name: "Duluth", published: false, content: null },
  { slug: "norcross", name: "Norcross", published: false, content: null },
  { slug: "snellville", name: "Snellville", published: false, content: null },
  { slug: "suwanee", name: "Suwanee", published: false, content: null },
  { slug: "buford", name: "Buford", published: false, content: null },
  { slug: "decatur", name: "Decatur", published: false, content: null },
  { slug: "marietta", name: "Marietta", published: false, content: null },
];

export type PublishedLocation = LocationPage & { published: true; content: LocationContent };

export function publishedLocations(): PublishedLocation[] {
  return locations.filter((l): l is PublishedLocation => l.published && l.content !== null);
}

export function getPublishedLocation(slug: string): PublishedLocation | undefined {
  return publishedLocations().find((l) => l.slug === slug);
}

/**
 * Marketing copy. Components read from here; they never hardcode wording.
 * Rules: no approval or income promises, no platform names, no social proof.
 */

export const heroCopy = {
  headline: "Need a Car to Work? We've Got You.",
  subheadline: "Weekly car rentals for rideshare, delivery, and gig workers across Metro Atlanta.",
} as const;

export const whoWeServe = {
  heading: "Who We Serve",
  intro:
    "ATL Work Cars is built for people who need a dependable car to earn a living — especially if you don't own one.",
  groups: [
    { title: "Rideshare drivers", description: "A comfortable, dependable car for passenger trips around town." },
    { title: "Food delivery", description: "A fuel-conscious car for a full day of restaurant runs." },
    { title: "Grocery delivery", description: "Room for bags and coolers on shopping and delivery orders." },
    { title: "Courier and package delivery", description: "Space for packages and parcels on route-based work." },
    { title: "Several apps at once", description: "One weekly car for drivers who switch between platforms." },
  ],
  disclosure:
    "Vehicles may be used on compatible rideshare or delivery platforms. Renters are responsible for confirming that a vehicle meets the requirements of whichever platform they intend to use, and for their own eligibility with that platform. Renting from ATL Work Cars does not guarantee acceptance onto any platform.",
} as const;

export const howItWorks = {
  heading: "How It Works",
  intro: "Four steps from application to the driver's seat.",
  steps: [
    {
      title: "Apply Online",
      description: "Fill out a short application on your phone. It takes a few minutes and costs nothing to submit.",
    },
    {
      title: "Get Approved",
      description: "Our team reviews your application and contacts you about next steps and current terms.",
    },
    {
      title: "Choose an Available Vehicle",
      description: "Pick from the cars available when you're approved, matched to the work you do.",
    },
    {
      title: "Pick Up Your Car and Start Working",
      description: "Sign your rental agreement, collect the keys, and get on the road.",
    },
  ],
  disclaimer: "Applying does not guarantee approval.",
} as const;

export const whyUs = {
  heading: "Why ATL Work Cars",
  features: [
    {
      title: "Weekly Rental Options",
      description: "Rent by the week, so you're not locked into a long-term loan or lease.",
    },
    {
      title: "Built for Working Drivers",
      description: "Every part of the process is designed around people who drive for a living.",
    },
    {
      title: "Local Metro Atlanta Service",
      description: "We're focused on Gwinnett County, Atlanta and the surrounding Metro Atlanta communities.",
    },
    {
      title: "Straightforward Pricing",
      description: "Your weekly rate and terms are explained up front, before you sign anything.",
    },
    {
      title: "Reliable Vehicles",
      description: "Practical, everyday cars chosen for the demands of daily work driving.",
    },
    {
      title: "Simple Application Process",
      description: "A short online application you can finish on your phone in a few minutes.",
    },
  ],
} as const;

export const closingCta = {
  heading: "Ready to get back on the road?",
  body: "Apply in a few minutes. Our team will review your application and contact you about available cars and next steps.",
} as const;

export const contactCopy = {
  heading: "Contact ATL Work Cars",
  homeHeading: "Contact",
  intro: "Questions about renting a work car? Call, text or email us, or send a message below.",
  formHeading: "Send us a message",
  successHeading: "Message Sent",
  successBody: "Thanks for reaching out. An ATL Work Cars team member will get back to you soon.",
} as const;

export const applyCopy = {
  heading: "Apply for a Work Car",
  intro:
    "Four short steps. We'll never ask for your Social Security number, license number, date of birth or payment details on this form.",
  successHeading: "Application Received",
  successBody:
    "An ATL Work Cars team member will review your information and contact you regarding availability and next steps.",
  disclaimer: "Submitting an application does not guarantee approval.",
  consent:
    "I agree to be contacted by ATL Work Cars by phone, text message, or email regarding my application. Message and data rates may apply.",
} as const;

export const footerCopy = {
  tagline: "Weekly work-car rentals for rideshare, delivery and gig drivers in Metro Atlanta.",
  disclaimer:
    "ATL Work Cars is an independent vehicle rental company and is not affiliated with or endorsed by any rideshare or delivery platform.",
} as const;

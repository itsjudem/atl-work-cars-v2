import type { LegalDocument } from "./types";
import { site } from "./site";

/**
 * Legal text. Written to describe only what the website actually does.
 * Have it reviewed by a lawyer before launch.
 */

export const privacyPolicy: LegalDocument = {
  title: "Privacy Policy",
  description: `How ${site.name} collects, uses and protects the information you submit on this website.`,
  updated: "2026-09-18",
  intro: `This policy explains what information ${site.name} collects through this website and how we use it.`,
  sections: [
    {
      heading: "Information you give us",
      paragraphs: [
        "When you submit an application we collect your name, phone number, email address, ZIP code, county, how you plan to use the vehicle, the platforms you work with (if you choose to tell us), how soon you need a vehicle, your age, whether you hold a valid driver's license and the state that issued it, whether you currently have a vehicle, your vehicle and pickup preferences, and any notes you add.",
        "When you use the contact form we collect your name, phone number, email address (if provided) and your message.",
        "This website never asks for your Social Security number, driver's license number, date of birth, bank or card details, or document uploads. Please do not send them through the website.",
      ],
    },
    {
      heading: "How we use it",
      paragraphs: [
        "We use your information to review your application, to contact you by phone, text message or email about your application or question, and to operate and improve our service.",
        "We do not sell your personal information.",
      ],
    },
    {
      heading: "Analytics and advertising",
      paragraphs: [
        "This website may use analytics and advertising tools, such as Google Analytics, Google Ads and Meta Pixel, to understand how visitors use the site and to measure our advertising. These tools may set cookies or collect information about your device and browsing. You can limit this through your browser settings.",
      ],
    },
    {
      heading: "Who we share it with",
      paragraphs: [
        "We share your information only with service providers who help us run the website and manage applications, and where required by law.",
      ],
    },
    {
      heading: "Keeping it safe",
      paragraphs: [
        "We use reasonable measures to protect the information you submit. No website or transmission over the internet can be guaranteed completely secure.",
      ],
    },
    {
      heading: "Your choices",
      paragraphs: [
        `You can ask us to update or delete the information you submitted, or to stop contacting you, by emailing ${site.email}. You can reply STOP to any text message to opt out of texts.`,
      ],
    },
    {
      heading: "Changes and contact",
      paragraphs: [
        `We may update this policy. The date at the top shows when it last changed. Questions? Email ${site.email}.`,
      ],
    },
  ],
};

export const termsOfService: LegalDocument = {
  title: "Terms of Service",
  description: `The terms that apply when you use the ${site.name} website.`,
  updated: "2026-09-18",
  intro: `These terms apply to your use of this website. Renting a vehicle is governed separately by a written rental agreement with ${site.name}.`,
  sections: [
    {
      heading: "Using this website",
      paragraphs: [
        "You agree to use this website lawfully and to provide accurate information in any form you submit.",
      ],
    },
    {
      heading: "Applications",
      paragraphs: [
        "Submitting an application does not guarantee approval or the availability of any vehicle. We may decline any application.",
        "Nothing on this website is an offer to rent. The terms of any rental — including price, deposit, insurance, mileage and maintenance — are set out only in the rental agreement you sign.",
      ],
    },
    {
      heading: "Vehicle listings",
      paragraphs: [
        "Vehicles marked \"Sample listing\" are examples only and are not available to rent. Availability of any listed vehicle can change at any time.",
      ],
    },
    {
      heading: "Rideshare and delivery platforms",
      paragraphs: [
        `${site.name} is an independent vehicle rental company and is not affiliated with or endorsed by any rideshare or delivery platform. Renting from us does not guarantee acceptance onto any platform, and we make no promise about earnings.`,
      ],
    },
    {
      heading: "Limitation of liability",
      paragraphs: [
        "This website is provided as is. To the extent permitted by law, we are not liable for any loss arising from your use of the website.",
      ],
    },
    {
      heading: "Changes and contact",
      paragraphs: [
        `We may update these terms. The date at the top shows when they last changed. Questions? Email ${site.email}.`,
      ],
    },
  ],
};

export const rentalPoliciesDoc = {
  title: "Rental Policies",
  description: `Weekly rental rates, deposits, insurance, mileage and other policies for ${site.name} work-car rentals.`,
  intro:
    "The policies below apply to weekly work-car rentals. Where a detail isn't listed yet, contact us or apply and we'll confirm the current terms with you before you sign anything. Your signed rental agreement is the final word on every term.",
} as const;

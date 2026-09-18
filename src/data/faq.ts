import type { FaqItem } from "./types";

/** Required wording for questions whose policy has not been supplied. */
export const POLICY_NOT_SUPPLIED =
  "Requirements and coverage depend on the rental agreement. Contact ATL Work Cars or submit an application for current details.";

export const faqs: FaqItem[] = [
  {
    question: "Who can rent a vehicle?",
    answer:
      "Drivers in Metro Atlanta who need a car to work — rideshare, food delivery, grocery delivery, courier or package work. You'll need a valid driver's license, proof of identity, to meet our minimum age requirement, and an approved application. Submitting an application does not guarantee approval.",
  },
  {
    question: "How does the weekly rental work?",
    answer:
      "You apply online, our team reviews your application, and if you're approved we match you with an available vehicle. You pick up the car and rent it week to week. Current rates and terms are confirmed with you before you sign a rental agreement.",
  },
  {
    question: "Can I use the vehicle for rideshare?",
    answer:
      "Vehicles may be used on compatible rideshare platforms. Each platform sets its own vehicle and driver requirements, so you're responsible for confirming that the car meets them and that you're eligible. Renting from ATL Work Cars does not guarantee acceptance onto any platform.",
  },
  {
    question: "Can I use the vehicle for food delivery?",
    answer:
      "Yes, vehicles may be used for food delivery, grocery delivery and courier work on compatible platforms. You're responsible for your own eligibility with whichever platform you use.",
  },
  { question: "Do you provide insurance?", answer: POLICY_NOT_SUPPLIED },
  { question: "Is maintenance included?", answer: POLICY_NOT_SUPPLIED },
  { question: "How much is the deposit?", answer: POLICY_NOT_SUPPLIED },
  {
    question: "How quickly can I get a vehicle?",
    answer:
      "It depends on how quickly your application is reviewed and which vehicles are available. Tell us how soon you need a car on the application and we'll let you know what's possible.",
  },
  {
    question: "Where do I pick up the vehicle?",
    answer:
      "Pickup takes place in Metro Atlanta. The exact pickup location and time are confirmed with you after your application is approved. You can tell us your preferred pickup area on the application.",
  },
  {
    question: "What documents do I need?",
    answer:
      "At minimum, a valid driver's license and proof of identity. Additional documentation may be required — we'll tell you exactly what's needed before pickup. Please don't send documents through the website.",
  },
  {
    question: "Can I rent if I don't currently own a car?",
    answer:
      "Yes. Most of our renters don't own a car — that's exactly why they rent from us.",
  },
  {
    question: "What areas do you serve?",
    answer:
      "Metro Atlanta: Gwinnett County, Fulton County (including Atlanta), DeKalb County, Cobb County and Clayton County. We don't serve areas outside Metro Atlanta.",
  },
];

/** Questions previewed in the homepage FAQ section (indexes into `faqs`). */
export const homeFaqCount = 6;

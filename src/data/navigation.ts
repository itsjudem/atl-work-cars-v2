import type { NavLink } from "./types";

export const cta = {
  primary: { label: "Apply for a Work Car", href: "/apply/" },
  secondary: { label: "View Available Cars", href: "/cars/" },
  heroSecondary: { label: "See How It Works", href: "/how-it-works/" },
  vehicle: "Apply for This Car",
  submit: "Submit My Application",
} as const;

/** Header navigation (the primary CTA is rendered separately). */
export const headerNav: NavLink[] = [
  { label: "Available Cars", href: "/cars/" },
  { label: "How It Works", href: "/how-it-works/" },
  { label: "Requirements", href: "/requirements/" },
  { label: "Service Area", href: "/service-area/" },
  { label: "FAQ", href: "/faq/" },
  { label: "Contact", href: "/contact/" },
];

export const footerNav: NavLink[] = [
  { label: "Home", href: "/" },
  { label: "Available Cars", href: "/cars/" },
  { label: "How It Works", href: "/how-it-works/" },
  { label: "Driver Requirements", href: "/requirements/" },
  { label: "Service Area", href: "/service-area/" },
  { label: "FAQ", href: "/faq/" },
  { label: "Contact", href: "/contact/" },
  { label: "Apply", href: "/apply/" },
];

export const legalNav: NavLink[] = [
  { label: "Privacy Policy", href: "/privacy-policy/" },
  { label: "Terms of Service", href: "/terms-of-service/" },
  { label: "Rental Policies", href: "/rental-policies/" },
];

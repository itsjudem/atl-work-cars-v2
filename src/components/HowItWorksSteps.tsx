import { howItWorks } from "@/data/copy";

export function HowItWorksSteps({ headingLevel = "h3" }: { headingLevel?: "h2" | "h3" }) {
  const H = headingLevel;
  return (
    <>
      <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {howItWorks.steps.map((step, i) => (
          <li key={step.title} className="card relative pt-12">
            <span
              aria-hidden="true"
              className="absolute left-5 top-4 font-heading text-2xl font-bold text-brand"
            >
              {String(i + 1).padStart(2, "0")}
            </span>
            <H className="text-xl font-bold">
              <span className="sr-only">Step {i + 1}: </span>
              {step.title}
            </H>
            <p className="mt-2 text-ink-soft">{step.description}</p>
          </li>
        ))}
      </ol>
      <p className="mt-6 text-sm text-ink-soft">{howItWorks.disclaimer}</p>
    </>
  );
}

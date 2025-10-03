const FeatureCard = ({
  title,
  description,
}: {
  title: string;
  description: string;
}) => (
  <div className="rounded-lg bg-gray-100/50 p-6 dark:bg-gray-800/50">
    <h3 className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">
      {title}
    </h3>
    <p className="mt-2 text-base text-gray-600 dark:text-gray-300">
      {description}
    </p>
  </div>
);

export function AboutSection() {
  return (
    // This section also uses min-h-screen to take up the full viewport height.
    // The background color is inherited from the layout in page.tsx
    <section className="relative flex min-h-screen items-center justify-center px-6 py-24 sm:py-32 lg:px-8">
      <div className="mx-auto max-w-4xl text-center">
        <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl dark:text-white">
          What is Cascade?
        </h2>
        <p className="mt-6 text-lg leading-8 text-gray-600 dark:text-gray-300">
          Cascade is a custom built web-app for Akiva to handle the internal
          requisition-approval process efficiently, conveniently, digitally, and
          securely. It is an online mass requisitiona and approval system.
        </p>

        <div className="mt-16 grid grid-cols-1 gap-8 text-left sm:grid-cols-2">
          <FeatureCard
            title="Efficient"
            description="Previous bottlenecks on individual waiting and transit time are now irrelevant."
          />
          <FeatureCard
            title="Convenient"
            description="Everyone can access it anytime and anywhere."
          />
          <FeatureCard
            title="Digital"
            description="Future features can be shipped when needed. Records can instantly be found. No more paper."
          />
          <FeatureCard
            title="Secure"
            description="A modern tech stack with proper authentication and authorization protocols were implemented to secure everything down"
          />
        </div>
      </div>
    </section>
  );
}

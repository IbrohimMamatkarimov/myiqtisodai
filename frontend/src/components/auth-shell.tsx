<div className="w-full max-w-4xl grid md:grid-cols-2 gap-8 items-center animate-fade-up">
  {/* Left side */}
  <div className="hidden md:flex flex-col items-center justify-center">
    <img
      src="/iqtisodai2.png"
      alt="Save money"
      className="w-full max-w-sm mx-auto"
    />

    <p className="mt-4 text-center text-sm text-ink-700/60 dark:text-cream-100/60 max-w-xs">
      {t('illustrationText')}
    </p>
  </div>

  {/* Right side */}
  <div className="w-full max-w-md mx-auto">
    <div className="mb-8 text-center">
      <h1 className="font-display text-2xl font-bold">
        {title}
      </h1>

      <p className="mt-1 text-sm text-ink-700/60 dark:text-cream-100/60">
        {subtitle}
      </p>
    </div>

    <div className="glass-card p-8">
      {children}
    </div>

    <p className="mt-6 text-center text-sm font-medium bg-gradient-to-r from-gold-500 via-emerald-500 to-gold-500 bg-clip-text text-transparent">
      Created by Ibrohim Mamatkarimov
    </p>
  </div>
</div>
    </div>
  );
}

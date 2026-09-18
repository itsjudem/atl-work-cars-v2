/** The single h1 for interior pages, on a light band. */
export function PageIntro({ title, lede, children }: { title: string; lede?: string; children?: React.ReactNode }) {
  return (
    <div className="border-b border-line bg-surface">
      <div className="container-page py-10 sm:py-14">
        <h1 className="text-4xl font-bold sm:text-5xl">{title}</h1>
        {lede ? <p className="lede">{lede}</p> : null}
        {children}
      </div>
    </div>
  );
}

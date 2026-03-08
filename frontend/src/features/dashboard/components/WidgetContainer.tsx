import { PropsWithChildren } from 'react';

type WidgetContainerProps = PropsWithChildren<{
  title: string;
}>;

export default function WidgetContainer({ title, children }: WidgetContainerProps) {
  return (
    <section className="card">
      <header style={{ borderBottom: '1px solid #eaecf0', marginBottom: '0.75rem' }}>
        <h2 style={{ marginTop: 0, marginBottom: '0.6rem', fontSize: '1.1rem' }}>{title}</h2>
      </header>
      <div>{children}</div>
    </section>
  );
}

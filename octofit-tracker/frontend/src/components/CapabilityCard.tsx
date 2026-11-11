import { useEffect, useState, type ReactNode } from 'react';

type Props<T> = {
  title: string;
  description: string;
  loadItems: () => Promise<T[]>;
  emptyMessage: string;
  renderItem: (item: T) => ReactNode;
};

export function CapabilityCard<T>({
  title,
  description,
  loadItems,
  emptyMessage,
  renderItem,
}: Props<T>) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const results = await loadItems();
        if (active) setItems(results);
      } catch {
        if (active) setError(`Unable to load ${title.toLowerCase()}.`);
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [loadItems, title]);

  return (
    <section className="card h-100">
      <div className="card-body">
        <h2 className="h4">{title}</h2>
        <p>{description}</p>
        {loading ? (
          <p role="status">Loading {title.toLowerCase()}...</p>
        ) : error ? (
          <p role="alert">{error}</p>
        ) : items.length === 0 ? (
          <p>{emptyMessage}</p>
        ) : (
          <ul className="list-unstyled mb-0">{items.map((item, index) => <li key={index}>{renderItem(item)}</li>)}</ul>
        )}
      </div>
    </section>
  );
}

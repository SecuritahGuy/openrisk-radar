import { type FormEvent, useRef, useEffect } from "react";

interface SearchBarProps {
  query: string;
  onQueryChange: (q: string) => void;
  onSearch: () => void;
  loading: boolean;
  error: string | null;
}

export function SearchBar({
  query,
  onQueryChange,
  onSearch,
  loading,
  error,
}: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (query.trim()) onSearch();
  }

  return (
    <div className="search-bar" style={styles.container}>
      <form className="search-form" onSubmit={handleSubmit} style={styles.form}>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder='e.g. 60543 or Chicago, IL'
          style={styles.input}
          aria-label="Search by ZIP code or city"
          aria-describedby={error || loading ? "search-status" : undefined}
        />
        {query.trim() && (
          <button
            type="button"
            style={styles.clearButton}
            onClick={() => {
              onQueryChange("");
              inputRef.current?.focus();
            }}
            disabled={loading}
            aria-label="Clear search"
            title="Clear search"
          >
            &times;
          </button>
        )}
        <button
          type="submit"
          style={{
            ...styles.button,
            ...(loading || !query.trim() ? styles.buttonDisabled : {}),
          }}
          disabled={loading || !query.trim()}
        >
          {loading ? "Searching..." : "Search"}
        </button>
      </form>
      {(loading || error) && (
        <div
          id="search-status"
          style={error ? styles.error : styles.status}
          role={error ? "alert" : "status"}
        >
          {error ?? "Resolving location and loading nearby feeds..."}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: "8px 12px",
    background: "#fff",
    borderBottom: "1px solid #e0e0e0",
  },
  form: {
    display: "flex",
    gap: 8,
    alignItems: "stretch",
  },
  input: {
    flex: 1,
    padding: "8px 12px",
    fontSize: 14,
    border: "1px solid #ccc",
    borderRadius: 6,
    outline: "none",
    minWidth: 0,
  },
  clearButton: {
    width: 36,
    border: "1px solid #cfd8dc",
    borderRadius: 6,
    background: "#fff",
    color: "#546e7a",
    cursor: "pointer",
    fontSize: 18,
    fontWeight: 700,
    lineHeight: 1,
  },
  button: {
    padding: "8px 16px",
    fontSize: 14,
    background: "#1565c0",
    color: "#fff",
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
    fontWeight: 600,
  },
  buttonDisabled: {
    background: "#90a4ae",
    cursor: "not-allowed",
  },
  status: {
    marginTop: 6,
    color: "#1565c0",
    fontSize: 13,
  },
  error: {
    marginTop: 6,
    color: "#c62828",
    fontSize: 13,
  },
};

import Link from "next/link";

export default function Home() {
  return (
    <main style={styles.page}>
      <section style={styles.hero}>
        <div style={styles.badge}>AI WORKFORCE PLATFORM</div>
        <h1 style={styles.title}>AI Teammates</h1>
        <p style={styles.subtitle}>
          Give every employee a personal AI workforce with specialized agents for coding,
          testing, documentation and other work — coordinated on one device under explicit permissions.
        </p>
        <div style={styles.actions}>
          <Link href="/login" style={styles.primary}>Open Workspace</Link>
          <a href="https://github.com/Momen-Abd32/AI-Teammates" target="_blank" rel="noreferrer" style={styles.secondary}>
            View GitHub
          </a>
        </div>
      </section>

      <section style={styles.grid}>
        <Feature title="Specialized Agents" text="Create multiple AI teammates for the same employee and assign each a focused role and model." />
        <Feature title="Safe Execution" text="Tool access is enforced by the API policy layer, with human approval for sensitive actions." />
        <Feature title="Shared Device" text="Agents can operate through one registered desktop runtime while keeping agent identities and permissions separate." />
        <Feature title="Memory & Collaboration" text="Work-scoped memory, conversations, tasks and delegated work keep agents coordinated without mixing private context." />
      </section>

      <footer style={styles.footer}>
        <span>AI Teammates · Submission Build</span>
        <Link href="/login">Sign in / Create workspace</Link>
      </footer>
    </main>
  );
}

function Feature({ title, text }: { title: string; text: string }) {
  return (
    <article style={styles.card}>
      <h2>{title}</h2>
      <p>{text}</p>
    </article>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    boxSizing: "border-box",
    padding: "72px 24px 32px",
    fontFamily: "Arial, sans-serif",
    color: "#171717",
    background: "#f7f7f8",
  },
  hero: {
    maxWidth: 900,
    margin: "0 auto",
    textAlign: "center",
  },
  badge: {
    display: "inline-block",
    padding: "7px 12px",
    borderRadius: 999,
    background: "#e9e9ec",
    color: "#555",
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 1,
  },
  title: {
    fontSize: "clamp(44px, 8vw, 76px)",
    margin: "18px 0 12px",
    letterSpacing: -3,
  },
  subtitle: {
    maxWidth: 720,
    margin: "0 auto",
    color: "#5f5f66",
    fontSize: 18,
    lineHeight: 1.65,
  },
  actions: {
    display: "flex",
    justifyContent: "center",
    gap: 12,
    marginTop: 30,
    flexWrap: "wrap",
  },
  primary: {
    background: "#171717",
    color: "#fff",
    textDecoration: "none",
    padding: "13px 20px",
    borderRadius: 10,
    fontWeight: 700,
  },
  secondary: {
    background: "#fff",
    color: "#171717",
    textDecoration: "none",
    padding: "13px 20px",
    borderRadius: 10,
    border: "1px solid #d8d8dc",
    fontWeight: 700,
  },
  grid: {
    maxWidth: 1000,
    margin: "64px auto 0",
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 14,
  },
  card: {
    background: "#fff",
    border: "1px solid #e1e1e4",
    borderRadius: 16,
    padding: 22,
    boxShadow: "0 4px 20px rgba(0,0,0,.04)",
  },
  footer: {
    maxWidth: 1000,
    margin: "64px auto 0",
    paddingTop: 20,
    borderTop: "1px solid #ddd",
    display: "flex",
    justifyContent: "space-between",
    gap: 16,
    color: "#777",
    fontSize: 13,
    flexWrap: "wrap",
  },
};

type IconName = "building" | "clipboard";

function Icon({ name }: { name: IconName }) {
  if (name === "building") {
    return (
      <svg
        className="empty-state-svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M4 20V10l8-4 8 4v10" />
        <path d="M4 10h16" />
        <path d="M10 20v-4h4v4" />
        <path d="M8 14h.01M12 14h.01M16 14h.01" />
      </svg>
    );
  }
  return (
    <svg
      className="empty-state-svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.35"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
      <rect x="9" y="3" width="6" height="4" rx="1" />
      <path d="M9 12h6M9 16h4" />
    </svg>
  );
}

type Props = {
  icon: IconName;
  title: string;
  description: string;
};

export function EmptyState({ icon, title, description }: Props) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon-wrap">
        <Icon name={icon} />
      </div>
      <p className="empty-state-title">{title}</p>
      <p className="empty-state-desc">{description}</p>
    </div>
  );
}

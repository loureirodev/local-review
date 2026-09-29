import type { DiffSource } from "@shared/types";
import { AgentIcon, GitHubIcon, GitLabIcon, ICON_SIZE_INLINE, UserIcon } from "./icons";

/** Where a comment came from; a link to the forge comment when it has a `url`. */
export function OriginIcon({ source, url }: { source: DiffSource | null; url?: string }) {
  if (!source) return null;

  let icon: React.ReactNode;
  let tooltip: string | undefined;

  switch (source.type) {
    case "github-pr":
      icon = <GitHubIcon size={ICON_SIZE_INLINE} />;
      tooltip = url ? "Open original comment on GitHub" : "GitHub comment";
      break;
    case "gitlab-mr":
      icon = <GitLabIcon size={ICON_SIZE_INLINE} />;
      tooltip = url ? "Open original comment on GitLab" : "GitLab comment";
      break;
    case "agent":
      icon = <AgentIcon size={ICON_SIZE_INLINE} />;
      tooltip = "AI agent review";
      break;
    case "branch":
    case "pending":
    case "folder":
      icon = <UserIcon size={ICON_SIZE_INLINE} />;
      tooltip = "Local comment";
      break;
    default:
      return null;
  }

  if (url && (source.type === "github-pr" || source.type === "gitlab-mr")) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        title={tooltip}
        className="text-muted hover:text-text transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        {icon}
      </a>
    );
  }

  return <span title={tooltip}>{icon}</span>;
}

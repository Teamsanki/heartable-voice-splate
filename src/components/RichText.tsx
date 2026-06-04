import { Link } from "@tanstack/react-router";
import { Fragment } from "react";

/**
 * Render text with #hashtags and @mentions as links.
 * - #tag → /tag/$tag
 * - @name → /search?q=@name (search route resolves the user)
 */
export function RichText({ text, className }: { text: string; className?: string }) {
  if (!text) return null;
  const re = /(#[a-zA-Z0-9_\u0900-\u097F]{2,30})|(@[a-zA-Z0-9_]{2,30})/g;
  const parts: React.ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push(<Fragment key={`t${i++}`}>{text.slice(last, m.index)}</Fragment>);
    const token = m[0];
    if (token.startsWith("#")) {
      const tag = token.slice(1).toLowerCase();
      parts.push(
        <Link key={`h${i++}`} to="/tag/$tag" params={{ tag }} className="text-sunset-600 hover:underline font-medium">
          {token}
        </Link>,
      );
    } else {
      const name = token.slice(1);
      parts.push(
        <Link key={`m${i++}`} to="/search" search={{ q: `@${name}` }} className="text-indigo-600 hover:underline font-medium">
          {token}
        </Link>,
      );
    }
    last = m.index + token.length;
  }
  if (last < text.length) parts.push(<Fragment key={`t${i++}`}>{text.slice(last)}</Fragment>);
  return <span className={className}>{parts}</span>;
}
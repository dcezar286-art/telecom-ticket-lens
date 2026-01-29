import React from "react";
import { classifyTag, colorToken } from "../utils/tags.js";

export default function TagPill({ tag }) {
  const rule = classifyTag(tag);
  const c = colorToken(rule.color);

  return (
    <span
      className="badge"
      title={rule.key}
      style={{
        background: c.bg,
        borderColor: c.bd,
        fontFamily: "inherit",
        fontSize: 12
      }}
    >
      {tag}
    </span>
  );
}

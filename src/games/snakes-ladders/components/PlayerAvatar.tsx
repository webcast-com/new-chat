import React from "react";
import { UserProfile } from "../types/profile";

interface PlayerAvatarProps {
  profile: Pick<UserProfile, "avatar" | "avatarUrl">;
  className?: string;
}

/**
 * Renders the platform avatar image when a game profile is linked to the chat
 * login (avatarUrl set), otherwise falls back to the emoji avatar.
 */
const PlayerAvatar: React.FC<PlayerAvatarProps> = ({ profile, className }) => {
  if (profile.avatarUrl) {
    return (
      <img
        src={profile.avatarUrl}
        alt=""
        loading="lazy"
        className={`${className || ""} rounded-full object-cover`}
      />
    );
  }
  return <span className={className || ""}>{profile.avatar}</span>;
};

export default PlayerAvatar;

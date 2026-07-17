import { useEffect, useRef, useState } from 'react';
import { supabase, Profile } from '../lib/supabase';

interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  rows?: number;
  className?: string;
}

export function renderMentions(content: string) {
  return content.split(/(@[A-Za-z0-9_]+)/g).map((part, index) =>
    part.startsWith('@') ? (
      <span key={`${part}-${index}`} className="font-semibold text-violet-600">
        {part}
      </span>
    ) : (
      <span key={`${part}-${index}`}>{part}</span>
    )
  );
}

export default function MentionInput({ value, onChange, placeholder, rows = 3, className = '' }: MentionInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [cursorPosition, setCursorPosition] = useState(0);

  useEffect(() => {
    const loadProfiles = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, full_name, bio, avatar_url, created_at, updated_at')
        .order('username')
        .limit(100);

      if (!error) setProfiles(data || []);
    };

    loadProfiles();
  }, []);

  const textBeforeCursor = value.slice(0, cursorPosition);
  const mentionMatch = textBeforeCursor.match(/(^|\s)@([A-Za-z0-9_]*)$/);
  const mentionQuery = mentionMatch?.[2].toLowerCase() || '';
  const suggestions = mentionMatch
    ? profiles
        .filter((profile) => profile.username.toLowerCase().startsWith(mentionQuery))
        .slice(0, 5)
    : [];

  const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(event.target.value);
    setCursorPosition(event.target.selectionStart);
  };

  const handleSelect = (username: string) => {
    const cursor = textareaRef.current?.selectionStart ?? cursorPosition;
    const beforeCursor = value.slice(0, cursor);
    const afterCursor = value.slice(cursor);
    const nextBeforeCursor = beforeCursor.replace(/@[A-Za-z0-9_]*$/, `@${username} `);
    const nextValue = `${nextBeforeCursor}${afterCursor}`;

    onChange(nextValue);
    requestAnimationFrame(() => {
      const nextCursor = nextBeforeCursor.length;
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(nextCursor, nextCursor);
      setCursorPosition(nextCursor);
    });
  };

  return (
    <div className="relative flex-1">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onSelect={(event) => setCursorPosition(event.currentTarget.selectionStart)}
        placeholder={placeholder}
        rows={rows}
        className={className}
      />
      {suggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion.id}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => handleSelect(suggestion.username)}
              className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-violet-50"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-xs font-semibold text-white">
                {suggestion.username.charAt(0).toUpperCase()}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-slate-900">@{suggestion.username}</span>
                {suggestion.full_name && <span className="block truncate text-xs text-slate-500">{suggestion.full_name}</span>}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
